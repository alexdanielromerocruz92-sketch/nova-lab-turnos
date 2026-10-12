import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import localeEs from '@angular/common/locales/es';
import { registerLocaleData } from '@angular/common';

registerLocaleData(localeEs, 'es-MX');

type Ticket = { numero: string; tipo: string; estado: string; creado: string };
type Desk = { numero: number; turno: Ticket | null };
type QueueState = {
  mesas: Desk[]; cola: Ticket[]; recientes: Ticket[];
  totales: { espera: number; atendiendo: number; completados: number };
};

@Component({
  selector: 'app-root', standalone: true, imports: [CommonModule],
  template: `
  <div class="layout">
    <aside class="sidebar">
      <a class="brand" href="#"><span class="mark">✳</span><span>nóva<small>LABORATORIO CLÍNICO</small></span></a>
      <p class="nav-label">OPERACIÓN</p>
      <button class="nav" [class.selected]="view==='dashboard'" (click)="view='dashboard'">▦ &nbsp; Panel de atención</button>
      <button class="nav" [class.selected]="view==='kiosk'" (click)="view='kiosk'">＋ &nbsp; Tótem de turnos</button>
      <button class="nav" [class.selected]="view==='display'" (click)="view='display'">▣ &nbsp; Pantalla pública</button>
      <div class="connection"><i></i><span><b>Servicio operativo</b><small>4 ventanillas disponibles</small></span></div>
    </aside>
    <main class="main">
      <header class="topbar"><span>Operación <b>/ {{viewName}}</b></span><span>{{ now | date:'EEEE, d MMMM':'':'es-MX' }} &nbsp; · &nbsp; Andrea López</span></header>
      <section class="content" *ngIf="view==='dashboard'">
        <div class="heading"><div><small>SUCURSAL CENTRO · {{now | date:'EEEE':'':'es-MX' | uppercase}}</small><h1>Panel de atención</h1><p>Monitorea la fila y administra las ventanillas en tiempo real.</p></div><button class="secondary" (click)="refresh()">↻ Actualizar</button></div>
        <div class="stats">
          <article><small>EN ESPERA</small><strong>{{state.totales.espera}}</strong><span>pacientes en fila</span></article>
          <article><small>EN ATENCIÓN</small><strong>{{state.totales.atendiendo}}</strong><span>de 4 ventanillas</span></article>
          <article><small>ATENDIDOS HOY</small><strong>{{state.totales.completados}}</strong><span>turnos completados</span></article>
          <article><small>ESPERA ESTIMADA</small><strong>{{state.totales.espera * 8}} <em>min</em></strong><span>aprox. · 8 min por paciente</span></article>
        </div>
        <div class="section-title"><div><h2>Ventanillas</h2><p>Los turnos se asignan a la siguiente ventanilla libre.</p></div><span class="live"><i></i> EN VIVO</span></div>
        <div class="desks"><article class="desk" *ngFor="let desk of state.mesas" [class.occupied]="desk.turno">
          <div class="desk-head"><b>VENTANILLA {{desk.numero}}</b><span [class.green]="desk.turno">● {{desk.turno?'Atendiendo':'Disponible'}}</span></div>
          <strong class="ticket" [class.blank]="!desk.turno">{{desk.turno?.numero || '— — —'}}</strong>
          <small class="kind">{{desk.turno ? label(desk.turno.tipo) : 'Esperando paciente'}}</small>
          <div class="desk-actions"><button *ngIf="desk.turno" class="secondary" (click)="deskAction(desk.numero,'finish')">Finalizar</button><button class="primary" (click)="deskAction(desk.numero,'next')">{{desk.turno?'Siguiente':'Llamar turno'}} →</button></div>
        </article></div>
        <div class="bottom-grid"><section class="card"><div class="card-head"><div><h2>Próximos en fila</h2><p>Turnos pendientes de asignación</p></div><span>{{state.cola.length}} turnos</span></div>
          <div class="row" *ngFor="let t of state.cola.slice(0,6); let i=index"><small>{{(i+1).toString().padStart(2,'0')}}</small><b>{{t.numero}}</b><span class="tag" [class]="'tag '+t.tipo">{{label(t.tipo)}}</span><time>{{t.creado | date:'HH:mm'}}</time></div>
          <p class="empty" *ngIf="!state.cola.length">La fila está despejada. Los nuevos turnos aparecerán aquí.</p>
        </section><section class="card"><div class="card-head"><div><h2>Actividad reciente</h2><p>Últimos turnos registrados</p></div></div>
          <div class="recent" *ngFor="let t of state.recientes.slice(0,6)"><i>{{t.estado==='completado'?'✓':'•'}}</i><span><b>{{t.numero}}</b><small>{{label(t.tipo)}}</small></span><em>{{t.estado==='completado'?'Atendido':t.estado==='atendiendo'?'En atención':'En fila'}}</em></div>
          <p class="empty" *ngIf="!state.recientes.length">Emite un turno desde el tótem para comenzar.</p>
        </section></div>
      </section>
      <section class="kiosk" *ngIf="view==='kiosk'"><div class="kiosk-card"><span class="kiosk-mark">✳</span><small>BIENVENIDO A NÓVA</small><h1>¿Cómo podemos<br>ayudarte hoy?</h1><p>Selecciona una opción para obtener tu turno.</p>
        <button *ngFor="let option of options" (click)="createTicket(option.key)"><i>{{option.icon}}</i><span><b>{{option.title}}</b><small>{{option.subtitle}}</small></span><strong>→</strong></button><footer>Tu salud, con atención cercana.</footer>
      </div><div class="modal" *ngIf="issued"><div class="receipt"><button class="close" (click)="issued=null">×</button><span class="mark">✳</span><small>TU TURNO</small><strong>{{issued}}</strong><p>Te llamaremos en la pantalla<br>cuando una ventanilla esté disponible.</p><footer>Gracias por elegir nóva</footer></div></div></section>
      <section class="display" *ngIf="view==='display'"><header><span class="mark">✳</span><span><b>nóva</b><small>LABORATORIO CLÍNICO</small></span><time>{{now | date:'HH:mm'}}</time></header><div class="display-title"><small>BIENVENIDO</small><h1>Turnos en atención</h1><p>Por favor, acude a la ventanilla indicada.</p></div><div class="display-grid"><article *ngFor="let desk of state.mesas"><small>VENTANILLA {{desk.numero}}</small><strong>{{desk.turno?.numero || '— — —'}}</strong><span>{{desk.turno?label(desk.turno.tipo):'Próximamente'}}</span></article></div><footer><span><i></i> Actualización en vivo</span><b>¿Dudas? Acércate a recepción</b></footer></section>
      <div class="toast" *ngIf="error"><span>{{error}}</span><button (click)="error=''">×</button></div>
    </main>
  </div>`
})
export class AppComponent implements OnInit, OnDestroy {
  view = 'dashboard'; now = new Date(); issued: string | null = null; error = '';
  private timer?: ReturnType<typeof setInterval>;
  readonly options = [
    {key:'recurrente',icon:'▤',title:'Paciente recurrente',subtitle:'Tengo tarjeta o afiliación'},
    {key:'primera_vez',icon:'＋',title:'Primera vez',subtitle:'Registro y toma de muestra'},
    {key:'aclaracion',icon:'☏',title:'Aclaración en ventanilla',subtitle:'Necesito resolver una duda'}
  ];
  state: QueueState = { mesas:[1,2,3,4].map(numero=>({numero,turno:null})), cola:[], recientes:[], totales:{espera:0,atendiendo:0,completados:0} };
  get viewName(){return ({dashboard:'Panel de atención',kiosk:'Tótem de turnos',display:'Pantalla pública'} as Record<string,string>)[this.view];}
  ngOnInit(){void this.refresh();this.timer=setInterval(()=>{this.now=new Date();void this.refresh()},2500);}
  ngOnDestroy(){if(this.timer)clearInterval(this.timer);}
  label(tipo:string){return ({recurrente:'Paciente recurrente',primera_vez:'Primera vez',aclaracion:'Aclaración en ventanilla'} as Record<string,string>)[tipo]||tipo;}
  async refresh(){try{const response=await fetch('/api/state');if(!response.ok)throw new Error();this.state=await response.json();this.error='';}catch{this.error='No se pudo conectar con la API. Inicia el servidor local.';}}
  private async post(url:string,body:unknown){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Ocurrió un error.');this.state=data.estado;return data;}
  async createTicket(tipo:string){try{const data=await this.post('/api/tickets',{tipo});this.issued=data.turno.numero;this.error='';}catch(error){this.error=error instanceof Error?error.message:'No se pudo crear el turno.';}}
  async deskAction(mesa:number,action:'next'|'finish'){try{await this.post(`/api/desks/${mesa}`,{action});this.error='';}catch(error){this.error=error instanceof Error?error.message:'No se pudo actualizar la ventanilla.';}}
}

bootstrapApplication(AppComponent).catch(error=>console.error(error));

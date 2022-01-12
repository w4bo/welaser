const router = new VueRouter({
  mode: 'history',
  routes: [
  /*
    name: Il contenuto del campo `to` del navlink che viene cliccato
    path: percorso in cui si va
    component: componente che viene caricato dal path indicato
  */
    { path: '/', name: 'TFiware', component: TFiware },
    { path: '/404', component: NotFound },
    { path: '*', redirect: '/404' }
  ]
})

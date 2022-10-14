const router = new VueRouter({
  mode: 'history',
  routes: [
    { path: '/', name: 'mapDashboard', component: mapDashboard },
    { path: '/entitymanagement', name: 'entityManagement', component: entityManagement },
    { path: '/statistics', name: 'statistics', component: statistics },
    { path: '/404', component: NotFound },
    { path: '*', redirect: '/404' }
  ]
})

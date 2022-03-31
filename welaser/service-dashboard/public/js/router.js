const router = new VueRouter({
  mode: 'history',
  routes: [
    { path: '/', name: 'mapDashboard', component: mapDashboard },
    { path: '/domainManager', name: 'domainManager', component: domainManager },
    { path: '/missionManager', name: 'missionManager', component: missionManager },
    { path: '/replayManager', name: 'replayManager', component: replayManager },
    { path: '/statistics', name: 'statistics', component: statistics },
    { path: '/404', component: NotFound },
    { path: '*', redirect: '/404' }
  ]
})

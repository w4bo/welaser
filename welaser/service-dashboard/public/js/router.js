const router = new VueRouter({
    mode: 'history',
    routes: [
        {path: '/', name: 'missiongui', component: missiongui},
        {path: '/debug', name: 'mapDashboard', component: mapDashboard},
        {path: '/devicedata', name: 'devicedata', component: devicedata},
        {path: '/entitymanagement', name: 'entityManagement', component: entityManagement},
        {path: '/missionplanner', name: 'missionPlanner', component: missionPlanner},
        {path: '/statistics', name: 'statistics', component: statistics},
        {path: '/404', component: NotFound},
        {path: '*', redirect: '/404'}
    ]
})

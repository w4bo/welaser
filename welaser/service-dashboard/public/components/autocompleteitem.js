const autocompleteitem = {
    template: `
        <!-- <template v-slot:selection="data">-->
        <!--     <v-chip v-bind="data.attrs" :input-value="data.selected" close @click="data.select" @click:close="remove(data.item)">-->
        <!--         {{ data.item.id }}-->
        <!--     </v-chip>-->
        <!-- </template>-->
        <v-list-item-content>
            <v-list-item-title v-if="data.item" v-html="data.item.name"></v-list-item-title>
            <v-list-item-title v-else v-html="data"></v-list-item-title>
            <v-list-item-subtitle v-if="data.item" v-html="data.item.id"></v-list-item-subtitle>
        </v-list-item-content>
    `,
    props: {
        data: Object
    }
}

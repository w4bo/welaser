const treenode = {
    props: {
        node: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            showChildren: false
        }
    },
    computed: {
        hasChildren() {
            const {children} = this.node
            return children && children.length > 0
        }
    },
    methods: {
    }
}

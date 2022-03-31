const Footer = {
    data: () => ({
        icons: [
        ],
      }),
    template: `
    <v-footer padless>
      <v-card class="flex" color="blue" flat tile >
        <v-card-text class="py-1 white--text text-center">
          <v-btn
          v-for="icon in icons"
          :key="icon"
          class="mx-1 my-1 pa-1"
          dark
          icon
          >
            <v-icon size="24px">{{ icon }}</v-icon>
          </v-btn>
        </v-card-text>
      </v-card>
    </v-footer>
    `
}
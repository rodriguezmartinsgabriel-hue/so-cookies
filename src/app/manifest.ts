import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Só Cookies & Café",
    short_name: "Só",
    description: "Peça seus cookies para retirada na loja",
    start_url: "/cardapio",
    display: "standalone",
    background_color: "#F7F3EC",
    theme_color: "#111111",
    orientation: "portrait",
    categories: ["food", "restaurant", "ordering"],
    shortcuts: [
      {
        name: "Cardápio",
        short_name: "Cardápio",
        description: "Ver cardápio e pedir",
        url: "/cardapio",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Carrinho",
        short_name: "Carrinho",
        description: "Ver carrinho de pedidos",
        url: "/carrinho",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Pedidos",
        short_name: "Pedidos",
        description: "Ver pedidos anteriores",
        url: "/pedido",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}

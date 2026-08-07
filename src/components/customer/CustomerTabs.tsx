"use client"

import { usePathname } from "next/navigation"
import { CardapioTab } from "./tabs/CardapioTab"
import { CarrinhoTab } from "./tabs/CarrinhoTab"
import { PerfilTab } from "./tabs/PerfilTab"

export function CustomerTabs() {
  const pathname = usePathname()

  const isCardapio = pathname === "/cardapio"
  const isCarrinho = pathname === "/carrinho"
  const isPerfil = pathname === "/perfil"

  return (
    <>
      <div className={isCardapio ? "" : "hidden"} aria-hidden={!isCardapio}>
        <CardapioTab />
      </div>
      <div className={isCarrinho ? "" : "hidden"} aria-hidden={!isCarrinho}>
        <CarrinhoTab />
      </div>
      <div className={isPerfil ? "" : "hidden"} aria-hidden={!isPerfil}>
        <PerfilTab />
      </div>
    </>
  )
}

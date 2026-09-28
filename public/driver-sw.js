"use strict";

/*
 * Service Worker da PWA do entregador.
 *
 * Intencionalmente não utiliza Cache Storage.
 * Dados de sessão, GPS, entregas e respostas das APIs
 * devem permanecer sempre dependentes da rede.
 */

self.addEventListener(
  "install",
  () => {
    self.skipWaiting();
  }
);

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      self.clients.claim()
    );
  }
);

self.addEventListener(
  "fetch",
  () => {
    /*
     * Sem event.respondWith():
     * o navegador utiliza o comportamento normal da rede.
     */
  }
);

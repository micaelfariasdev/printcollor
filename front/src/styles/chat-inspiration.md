/**
 * Técnicas de UI/UX: WhatsApp Web, Kommo, Tawk.to
 * Análise e implementação no PrintCollor
 *
 * === WHATSAPP WEB ===
 * Técnicas identificadas:
 * 1. Layout: 3 colunas (Sidebar esquerda + Chat + Info panel direita)
 * 2. Sidebar: lista de conversas com avatar, nome, última msg, hora
 * 3. Busca integrada no header da sidebar
 * 4. Scrollbar invisível por padrão (aparece no hover)
 * 5. Mensagens: balões verdes (enviadas) e brancos (recebidas)
 * 6. Hora da mensagem no canto inferior direito do balão
 * 7. Status de entrega (relógio, check único, check duplo)
 * 8. Polling/socket para novas mensagens
 * 9. Auto-scroll para última mensagem
 * 10. Composer: barra fixa inferior com emoji, anexo, câmera
 *
 * === KOMMO (ex-AmoCRM) ===
 * Técnicas identificadas:
 * 1. Sidebar: lista de chats com cores de status (verde=online, etc)
 * 2. Agrupamento por: não lidos, favoritos, grupos
 * 3. Indicador visual de mensagens não lidas (badge vermelho)
 * 4. Preview da última mensagem na sidebar
 * 5. Avatar com indicador de status online
 * 6. Scrollbar fina e discreta (6px width)
 * 7. Chat: timestamp agrupado por dia
 * 8. Quick replies / templates de resposta
 * 9. Sidebar recolhível (collapse)
 *
 * === TAWK.TO ===
 * Técnicas identificadas:
 * 1. Widget minimalista (pop-up no canto)
 * 2. Header com cor sólida da marca
 * 3. Mensagens com "typing indicator" (bolinhas animadas)
 * 4. Scroll-to-bottom button flutuante
 * 5. Chat area com gradiente sutil no bg
 * 6. Mensagens com cauda (tail) no balão
 * 7. Avatar pequeno ao lado da mensagem recebida
 * 8. Horário em formato 12h/24h conforme locale
 * 9. Sound notification para novas msgs
 *
 * === IMPLEMENTAÇÃO NO PRINTCOLlor ===
 *
 * [x] 1. Scrollbar global fina (6px) - ver scrollbar.css
 * [x] 2. Cores padrão WhatsApp - ver whatsapp-theme.css
 * [ ] 3. Sidebar: lista de instâncias com preview da última msg
 * [ ] 4. Badge de não lidas (Kommo style)
 * [ ] 5. Balões de mensagem com cores WA (verde/branco)
 * [ ] 6. Horário no balão + agrupamento por dia
 * [ ] 7. Indicador de envio (relógio -> check -> check duplo)
 * [ ] 8. Auto-scroll pra última mensagem
 * [ ] 9. Polling de 3s pra novas mensagens
 * [ ] 10. Feedback visual ao enviar (loading no botão)
 * [ ] 11. Scroll-to-bottom button quando não estiver no final
 * [ ] 12. Chat bg com padrão sutil (WA style)
 * [ ] 13. Header do chat com info da instância
 * [ ] 14. Composer fixo inferior com botão enviar
 *
 * Referências:
 * - https://web.whatsapp.com (inspecionar elemento)
 * - https://www.kommo.com (chat widget)
 * - https://www.tawk.to (live chat widget)
 */

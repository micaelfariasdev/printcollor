# Plano — WhatsApp de notificações DTF

## Objetivo

Criar uma integração exclusiva para notificações automáticas dos pedidos DTF. Ela não será uma central de atendimento e usará um número de WhatsApp próprio.

Uma futura central de atendimento usará uma segunda instância `whaileys`, outro número e modelos/filas independentes.

## Escopo desta etapa

- Parear e manter uma instância WhatsApp exclusiva de notificações DTF.
- Enviar mensagens automáticas para eventos relevantes do pedido.
- Enviar QR Code PIX, PIX copia e cola e link público quando aplicável.
- Registrar todo envio, falha e reenvio manual.
- Exigir confirmação visual antes de alterar os status `Pago`, `Impresso` e `Finalizado` no painel DTF.

Não faz parte desta etapa:

- Receber e organizar conversas.
- Caixa de entrada, operadores, filas ou histórico de atendimento.
- Compartilhar sessão, tabelas ou número com a futura central de atendimento.
- PIN ou senha adicional para confirmação de status.

## Arquitetura

```text
Painel DTF / API Django
        |
        | autenticação interna + fila de notificações
        v
Serviço Node: whatsapp-dtf-notifier
        |
        | whaileys + sessão persistente
        v
WhatsApp de notificações DTF

Futuro: Serviço Node separado para central de atendimento
        |
        v
Segundo WhatsApp, sessão e banco de atendimento próprios
```

O serviço `whatsapp-dtf-notifier` será privado na infraestrutura. O Django será o único consumidor da API interna dele.

## Serviço de notificações

### Responsabilidades

- Conectar usando `whaileys`.
- Expor o QR Code de pareamento e o estado da conexão.
- Persistir com segurança as credenciais da sessão em volume exclusivo.
- Enviar texto, imagem/QR Code e botões/links compatíveis.
- Retornar ao Django o resultado de cada tentativa.
- Reconectar automaticamente quando a sessão cair, exceto quando o logout exigir novo pareamento.

### API interna inicial

- `GET /health`: saúde do serviço.
- `GET /connection`: estado, número conectado e QR atual quando disponível.
- `POST /connection/reconnect`: solicitar nova conexão.
- `POST /notifications/send`: enviar uma notificação DTF já montada.

Todas as rotas internas exigirão uma chave de serviço armazenada apenas nas variáveis de ambiente.

## Dados no Django

### Configuração

`DTFNotificacaoConfig`

- ativo;
- URL interna do serviço;
- número conectado e estado da conexão, para exibição no painel;
- chave de autenticação do serviço armazenada de forma segura;
- opção para ativar/desativar notificações automáticas.

### Histórico

`DTFNotificacao`

- pedido DTF relacionado;
- evento;
- telefone de destino normalizado;
- conteúdo/resumo enviado;
- status: `pendente`, `enviando`, `enviado`, `falhou`, `cancelado`;
- tentativas, erro, identificador retornado pelo WhatsApp;
- criação, envio e usuário que solicitou reenvio.

Uma restrição de unicidade por pedido e evento evitará duplicidade de mensagens automáticas.

## Eventos automáticos

| Evento | Conteúdo principal |
| --- | --- |
| Pedido criado | resumo, valor, arte e link público |
| Pedido feito | confirmação de entrada na produção |
| Pagamento confirmado | confirmação financeira |
| Impresso | aviso de pedido pronto |
| Finalizado | confirmação de entrega/conclusão |
| Reenvio manual | mensagem escolhida pelo usuário no painel |

O andamento do pedido e o pagamento permanecem independentes: um pedido pode ser impresso ou finalizado mesmo em aberto financeiramente.

## Pagamento e link público

Quando houver PIX pendente, a mensagem poderá conter:

- imagem do QR Code;
- código PIX copia e cola em texto;
- valor;
- botão/link para a página pública do pedido.

O botão abrirá a página pública. A cópia do PIX continuará disponível como texto e na própria página pública, pois o WhatsApp não deve ser tratado como acesso garantido à área de transferência do celular.

## Confirmação de alteração de status

Para prevenir cliques acidentais no painel DTF:

1. O clique em `Pago`, `Impresso` ou `Finalizado` abre um modal.
2. O modal mostra cliente, número do pedido, status atual e próximo status.
3. O usuário escolhe `Cancelar` ou `Confirmar`.
4. Somente após confirmar a API altera o pedido e cria a notificação automática.
5. A alteração registra usuário, data/hora e status anterior em auditoria.

Não haverá PIN, senha adicional ou nova autenticação nessa confirmação.

## Sequência de implementação

1. Criar o serviço Node isolado com `whaileys`, Docker e persistência de sessão.
2. Implementar endpoints internos de saúde, QR Code, conexão e envio.
3. Criar migrations e modelos de configuração/histórico no Django.
4. Criar cliente interno Django para enfileirar e enviar notificações com tentativas controladas.
5. Implementar templates de cada evento e normalização dos telefones.
6. Criar tela de configuração da instância DTF e histórico de notificações por pedido.
7. Adicionar modais de confirmação aos status do painel DTF.
8. Testar pareamento, reconexão, falhas, reenvio e prevenção de duplicidade.
9. Fazer rollout com as notificações desligadas; parear, validar envio manual e então ativar os eventos automáticos.

## Critérios de aceite

- Um administrador consegue parear o WhatsApp DTF por QR Code.
- O sistema mostra se a instância está conectada.
- Cada evento configurado envia no máximo uma notificação automática por pedido.
- Falhas ficam visíveis e podem ser reenviadas manualmente.
- Alterações de status exigem confirmação modal.
- A futura central de atendimento pode ser criada sem alterar o serviço, sessão ou banco desta integração.

## Execução com PM2

No servidor, dentro da pasta `whatsapp-dtf-notifier`, instale as dependências com `npm install`, edite `ecosystem.config.cjs` para definir um `NOTIFIER_TOKEN` forte e inicie com `pm2 start ecosystem.config.cjs`. Em seguida, use `pm2 save` e `pm2 startup` para manter o serviço após reinicializações.

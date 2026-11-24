# Pixel Perfect

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4f76dc78-19b0-46da-addb-8c06072a84e3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Cobranças com Mercado Pago

Em **OS → Faturar & Concluir**, use **Encerrar e cobrar pelo Mercado Pago** para entregar uma OS em reparo ou pronta e cobrar o orçamento integral em reais. O link fica disponível na OS e no Financeiro para copiar e enviar ao cliente. Para um pagamento já recebido, use o fluxo de faturamento existente. Em **Financeiro → Cobranças do Mercado Pago**, informe descrição e valor para criar uma cobrança avulsa.

### Configuração

1. Vincule a CLI do Supabase ao projeto usado pelo aplicativo e aplique a migração com `supabase db push`.
2. Crie uma aplicação Checkout Pro no Mercado Pago. Em Webhooks, cadastre o evento **Pagamentos** e a URL `https://<project-ref>.supabase.co/functions/v1/mp-webhook`. Copie a assinatura secreta desse ambiente.
3. Nos secrets das Edge Functions do Supabase, configure `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET`. Use `MP_SANDBOX=true` para selecionar o link de teste. As credenciais ficam exclusivamente nas funções.
4. Publique as funções com `supabase functions deploy mp-cobranca` e `supabase functions deploy mp-webhook`. Publique o frontend após aplicar a migração.
5. Teste uma cobrança avulsa e outra de OS com contas de teste de vendedor e comprador. Confira o valor no checkout, a entrega do webhook e a mudança de pendente para paga no Financeiro. Para ativar a produção, use as credenciais e o webhook de produção e defina `MP_SANDBOX=false`.

Se a criação do link falhar depois da entrega, use **Gerar link** na cobrança existente. O sistema usa a referência da cobrança, verifica a assinatura da notificação e consulta o pagamento na API antes de atualizar o valor recebido. Uma devolução integral altera a situação para estornada. A tela consulta os dados novamente a cada 30 segundos.

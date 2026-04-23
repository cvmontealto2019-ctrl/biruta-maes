# Sistema Promoção Dia das Mães - Buffet Biruta Park

Sistema completo da campanha com:
- tela da mãe com cadastro, quiz e prêmio
- área administrativa em `/admin`
- persistência local em arquivo JSON
- relatório para impressão
- animação infinita de corações e logos flutuando

## Login admin
- usuário: `biruta`
- senha: `biruta@2026`

## Onde salvar a logo
Salve a logo do buffet neste arquivo:

`public/assets/logo-biruta.png`

Se quiser trocar depois, basta substituir a imagem pelo mesmo nome.

## Como rodar
Pré-requisito: Node.js 18+

1. Abra a pasta do projeto
2. Execute:

```bash
npm start
```

3. Acesse:
- campanha: `http://localhost:3000`
- admin: `http://localhost:3000/admin`

## Onde ficam os dados
Os cadastros ficam salvos em:

`data/participants.json`

## Ajustes rápidos importantes
### Número do WhatsApp final
No arquivo `public/app.js`, procure por:

`https://wa.me/5516999999999`

Troque pelo número oficial do buffet.

### Login admin
No arquivo `server/index.js`, você pode trocar:
- `ADMIN_USER`
- `ADMIN_PASS`

ou rodar com variáveis de ambiente.

## Estrutura
- `public/` front-end da campanha e admin
- `server/` servidor Node
- `data/` base local da campanha

## Observações
- Um WhatsApp só participa uma vez
- A campanha pode ser encerrada pela admin sem apagar os dados
- O relatório foi otimizado para impressão compacta em A4

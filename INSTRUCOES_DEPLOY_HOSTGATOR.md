# Instruções para Deploy PWA na Hostgator

## Problema Identificado
O sistema funciona no localhost mas não permite instalação PWA no servidor https://orion.estrategicengenharia.com.br/

## Soluções Implementadas

### 1. ✅ Arquivo .htaccess Criado
- Configurações de segurança para PWA
- Headers corretos para Service Worker
- Redirecionamento HTTPS obrigatório
- Cache otimizado para arquivos PWA

### 2. ✅ Manifest.json Atualizado
- Propriedades adicionais para melhor compatibilidade
- Configurações específicas para produção
- Ícones múltiplos definidos

### 3. ✅ Ícones PNG Criados
- Todos os tamanhos necessários (72x72 até 512x512)
- Formatos corretos para diferentes dispositivos

## Passos para Deploy

### 1. Upload dos Arquivos
```
1. Fazer build: npm run build
2. Upload da pasta dist/ para o servidor
3. Upload do arquivo .htaccess para a raiz
4. Upload da pasta public/icons/ para /icons/
```

### 2. Verificar HTTPS
```
- Confirmar que https://orion.estrategicengenharia.com.br/ está funcionando
- Verificar se há redirecionamento automático HTTP → HTTPS
```

### 3. Testar PWA
```
1. Acessar https://orion.estrategicengenharia.com.br/
2. Abrir DevTools (F12) → Application → Manifest
3. Verificar se manifest.json está carregando
4. Verificar se Service Worker está registrado
5. Testar instalação: Menu Chrome → "Instalar Multiweave"
```

## Arquivos Necessários no Servidor

### Estrutura de Pastas:
```
/
├── .htaccess                    ← Configurações PWA
├── index.html                   ← Página principal
├── manifest.json               ← Manifest PWA
├── sw.js                       ← Service Worker
├── icons/                      ← Ícones PWA
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
└── assets/                     ← Arquivos JS/CSS compilados
    ├── index-*.js
    ├── index-*.css
    └── ...
```

## Verificações Importantes

### 1. HTTPS Obrigatório
- PWA só funciona com HTTPS (exceto localhost)
- Verificar certificado SSL válido
- Redirecionamento automático HTTP → HTTPS

### 2. Headers Corretos
- Service-Worker-Allowed: /
- Content-Type: application/manifest+json
- Cache-Control apropriado

### 3. Arquivos Acessíveis
- manifest.json deve retornar 200 OK
- sw.js deve retornar 200 OK
- Ícones devem carregar corretamente

## Comandos para Deploy

### Build Local:
```bash
npm run build
```

### Upload via FTP/SFTP:
```
1. Upload pasta dist/ → raiz do site
2. Upload .htaccess → raiz do site
3. Upload public/icons/ → /icons/
```

### Teste Pós-Deploy:
```bash
# Verificar HTTPS
curl -I https://orion.estrategicengenharia.com.br/

# Verificar Manifest
curl -I https://orion.estrategicengenharia.com.br/manifest.json

# Verificar Service Worker
curl -I https://orion.estrategicengenharia.com.br/sw.js
```

## Troubleshooting

### Se ainda não funcionar:

1. **Verificar Console do Chrome:**
   - DevTools → Console
   - Procurar erros relacionados a PWA

2. **Verificar Lighthouse:**
   - DevTools → Lighthouse
   - Auditar PWA
   - Verificar pontuação

3. **Verificar Network:**
   - DevTools → Network
   - Verificar se manifest.json e sw.js carregam

4. **Verificar Application:**
   - DevTools → Application → Manifest
   - Verificar se manifest está válido

## Status Esperado

Após deploy correto:
- ✅ HTTPS funcionando
- ✅ Manifest.json carregando
- ✅ Service Worker registrado
- ✅ Ícones acessíveis
- ✅ Prompt de instalação aparecendo
- ✅ App instalável no celular

## Contato para Suporte

Se ainda houver problemas após seguir estas instruções, verificar:
1. Configurações do servidor Hostgator
2. Permissões de arquivos
3. Configurações de cache
4. Logs de erro do servidor

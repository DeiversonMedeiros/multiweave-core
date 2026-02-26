# Análise: Travamento após 3ª aprovação em Correções de Ponto

**Página:** `portal-gestor/aprovacoes/correcoes-ponto`  
**Sintoma:** Após a terceira aprovação, os botões (Aprovar, Fechar, Cancelar) param de responder. Não há erro no console. Atualizar a página restaura o uso.

## Causas prováveis (avaliadas)

1. **Overlay / focus trap do Radix Dialog**  
   Em alguns navegadores ou versões, após vários ciclos de abrir/fechar o modal, o overlay ou o gerenciamento de foco pode não ser liberado corretamente, deixando uma camada invisível que captura cliques.

2. **Estado da mutation (React Query)**  
   Se a requisição de aprovação não resolver (rede lenta, aba em segundo plano, proxy), `isPending` pode permanecer `true` e o botão “Aprovar” fica desabilitado. O Cancelar e o Fechar não dependem disso; se eles também não respondem, o problema tende a ser overlay/foco.

3. **Estado local desatualizado**  
   Múltiplas aberturas/fechamentos dos dialogs sem limpar estado (e sem “remount” do Dialog) podem deixar o componente em um estado inconsistente em certos ambientes.

## Correções implementadas no código

- **Key no Dialog:** Cada abertura/fechamento usa uma `key` diferente (`approve-{id}` / `approve-closed`, `reject-{id}` / `reject-closed`), forçando nova instância do Dialog e ajudando o Radix a liberar overlay e foco.
- **Reset ao fechar:** No `onOpenChange` dos dialogs de aprovação e rejeição, ao fechar são limpos observações, `selectedCorrection` e é chamado `approveMutation.reset()` / `rejectMutation.reset()`, evitando estado “travado” da mutation.
- **Reset ao abrir:** Ao abrir o dialog de aprovação ou rejeição, a mutation correspondente é resetada, para não carregar um estado “Aprovando...” ou de erro da ação anterior.
- **Reset após sucesso:** Após aprovar ou rejeitar com sucesso, além de fechar e limpar estado, é chamado o `reset()` da mutation.

Com isso, espera-se reduzir ou eliminar o travamento após várias aprovações, inclusive em navegadores mais sensíveis.

## Recomendações para usuários afetados (enquanto validam o fix)

- **Atualizar a página** (F5) quando os botões pararem de responder.
- **Navegador:** Usar versão atual do Chrome, Edge ou Firefox; evitar versões muito antigas.
- **Aba ativa:** Manter a aba em primeiro plano durante a aprovação; abas em segundo plano podem atrasar ou “travar” a conclusão da requisição em alguns casos.
- **Extensões:** Testar em janela anônima/privada (sem extensões) para descartar bloqueio de script ou rede.

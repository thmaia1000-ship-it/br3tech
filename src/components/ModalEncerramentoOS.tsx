import React, { useState, useEffect } from "react";
import {
  Check,
  X,
  Minus,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  QrCode,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Save,
  RotateCcw,
  Zap,
  BatteryCharging,
  Battery,
  ClipboardCheck,
  Receipt,
  CreditCard,
  Banknote,
  Building,
  Printer,
  Share2,
  FileText,
  ArrowRight,
  MessageCircle,
  ArrowLeft,
  DollarSign,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "@/components/QRCodeSVG";
import {
  ITENS_CHECKLIST_SAIDA,
  type ConferenciaChecklist,
  type StatusConferencia,
  type EncerramentoOS,
  type DiagnosticoExecutado,
  type PagamentoOS,
  type TipoPagamentoOS,
  TIPOS_PAGAMENTO_OS_LABELS,
} from "@/lib/conferencia-aparelho";
import {
  type ReciboAvulso,
  type FormaPagamentoRecibo,
  FORMAS_PAGAMENTO_LABELS,
  converterParaExtenso,
  gerarProximoNumeroRecibo,
  salvarRecibo,
  gerarTextoWhatsAppRecibo,
} from "@/lib/recibos";
import { moeda, linkWhatsApp } from "@/lib/br3";
import { ReciboImpressoModal } from "@/components/ReciboImpressoModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ModalEncerramentoOSProps {
  aberto: boolean;
  onFechar: () => void;
  osId: string;
  osNumero: string;
  aparelhoModelo: string;
  clienteNome?: string;
  clienteDocumento?: string;
  clienteTelefone?: string;
  clienteId?: string;
  valorPecas?: number;
  valorMaoObra?: number;
  defeitoRelatado?: string;
  diagnostico?: string;
  encerramentoAtual?: EncerramentoOS | null;
  onSalvarEncerramento: (novoEncerramento: EncerramentoOS) => Promise<void>;
  podeConcluirOS?: boolean;
  onConcluirOS?: (dadosPagamento?: PagamentoOS) => Promise<void>;
  onEmitirRecibo?: (recibo: ReciboAvulso) => void;
  abaInicial?: "checklist" | "faturamento";
}

export function ModalEncerramentoOS({
  aberto,
  onFechar,
  osId,
  osNumero,
  aparelhoModelo,
  clienteNome,
  clienteDocumento,
  clienteTelefone,
  clienteId,
  valorPecas = 0,
  valorMaoObra = 0,
  defeitoRelatado,
  diagnostico,
  encerramentoAtual,
  onSalvarEncerramento,
  podeConcluirOS = false,
  onConcluirOS,
  onEmitirRecibo,
  abaInicial = "checklist",
}: ModalEncerramentoOSProps) {
  // Identifica a URL base correta: se for localhost, disponibiliza também o IP de rede local
  const originAtual = typeof window !== "undefined" ? window.location.origin : "";
  const hostnameAtual = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const portaAtual = typeof window !== "undefined" ? window.location.port || "3000" : "3000";

  // IP local detectado da máquina de desenvolvimento
  const ipRedeLocal = "192.168.1.13";
  const [usarIpRede, setUsarIpRede] = useState(
    hostnameAtual === "localhost" || hostnameAtual === "127.0.0.1",
  );

  // Sessão de autenticação do técnico para transferir login transparente ao smartphone via QR Code
  const [sessionAuth, setSessionAuth] = useState<{
    access_token: string;
    refresh_token: string;
  } | null>(null);
  const [incluirLoginAutomatico, setIncluirLoginAutomatico] = useState(false);
  const [nomeUsuarioLogado, setNomeUsuarioLogado] = useState("BR3 Tech");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionAuth({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        supabase
          .from("profiles")
          .select("nome")
          .eq("id", data.session.user.id)
          .maybeSingle()
          .then(({ data: prof }) => {
            if (prof?.nome) setNomeUsuarioLogado(prof.nome);
          });
      }
    });
  }, []);

  // Controle de abas do modal: Checklist -> Faturamento -> Conclusão/Recibo
  const [abaModal, setAbaModal] = useState<"checklist" | "faturamento" | "concluido">(abaInicial);

  // Modo do QR Code: padrão abre direto o Checklist de Inspeção de Saída, com opção de testes de hardware
  const [modoQrCode, setModoQrCode] = useState<"checklist" | "hardware">("checklist");

  const urlBase =
    usarIpRede && (hostnameAtual === "localhost" || hostnameAtual === "127.0.0.1")
      ? `http://${ipRedeLocal}:${portaAtual}`
      : originAtual;

  const urlDestinoLimpa = `${urlBase}/diagnostico/${osId}?tab=${modoQrCode}`;
  const urlDestinoComAuth =
    sessionAuth && sessionAuth.access_token && sessionAuth.access_token.length < 1200
      ? `${urlDestinoLimpa}#token=${encodeURIComponent(sessionAuth.access_token)}`
      : urlDestinoLimpa;

  const urlDiagnostico =
    incluirLoginAutomatico && sessionAuth ? urlDestinoComAuth : urlDestinoLimpa;

  // Checklist de saída manual
  const [checklist, setChecklist] = useState<ConferenciaChecklist>(() => {
    const inicial: ConferenciaChecklist = {};
    for (const item of ITENS_CHECKLIST_SAIDA) {
      inicial[item] = encerramentoAtual?.checklistSaida?.[item] ?? null;
    }
    return inicial;
  });

  const [obsSaida, setObsSaida] = useState(encerramentoAtual?.observacoesSaida || "");
  const [salvando, setSalvando] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [mostrarQrCodeModal, setMostrarQrCodeModal] = useState(false);

  // Estado do Diagnóstico de Hardware
  const [diagnosticoHardware, setDiagnosticoHardware] = useState<DiagnosticoExecutado | null>(
    encerramentoAtual?.diagnosticoHardware || null,
  );

  // =========================================================================
  // ESTADO DO MENU DE FATURAMENTO E PAGAMENTO
  // =========================================================================
  const totalCalculadoOS = Number(valorPecas || 0) + Number(valorMaoObra || 0);

  const pagamentoExistente = encerramentoAtual?.pagamento;

  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamentoOS>(
    pagamentoExistente?.tipo || "integral",
  );
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoRecibo>(
    pagamentoExistente?.forma || "pix",
  );
  const [desconto, setDesconto] = useState<number | "">(
    pagamentoExistente?.desconto !== undefined ? pagamentoExistente.desconto : 0,
  );
  const [valorPago, setValorPago] = useState<number | "">(
    pagamentoExistente?.valorPago !== undefined
      ? pagamentoExistente.valorPago
      : Math.max(0, totalCalculadoOS - (Number(desconto) || 0)),
  );
  const [parcelas, setParcelas] = useState<number>(pagamentoExistente?.parcelas || 1);
  const [valorDinheiroRecebido, setValorDinheiroRecebido] = useState<number | "">(
    pagamentoExistente?.trocoPara || "",
  );
  const [obsPagamento, setObsPagamento] = useState<string>(
    pagamentoExistente?.observacoes || "",
  );
  const [gerarRecibo, setGerarRecibo] = useState<boolean>(true);
  const [modeloImpressaoRecibo, setModeloImpressaoRecibo] = useState<
    "duas_vias" | "pagina_unica" | "termica_80mm"
  >("duas_vias");

  // Estado do recibo gerado
  const [reciboGerado, setReciboGerado] = useState<ReciboAvulso | null>(null);
  const [modalReciboVisualizarAberto, setModalReciboVisualizarAberto] = useState(false);

  // Sincroniza estado ao abrir ou receber novos dados
  useEffect(() => {
    if (aberto) {
      setAbaModal(abaInicial);
      const inicial: ConferenciaChecklist = {};
      for (const item of ITENS_CHECKLIST_SAIDA) {
        inicial[item] = encerramentoAtual?.checklistSaida?.[item] ?? null;
      }
      setChecklist(inicial);
      setDiagnosticoHardware(encerramentoAtual?.diagnosticoHardware || null);
      setObsSaida(encerramentoAtual?.observacoesSaida || "");

      // Sincroniza faturamento
      if (encerramentoAtual?.pagamento) {
        const pag = encerramentoAtual.pagamento;
        setTipoPagamento(pag.tipo);
        setFormaPagamento(pag.forma);
        setDesconto(pag.desconto ?? 0);
        setValorPago(pag.valorPago);
        setParcelas(pag.parcelas || 1);
        setValorDinheiroRecebido(pag.trocoPara || "");
        setObsPagamento(pag.observacoes || "");
      } else {
        setTipoPagamento("integral");
        setFormaPagamento("pix");
        setDesconto(0);
        setValorPago(totalCalculadoOS);
        setParcelas(1);
        setValorDinheiroRecebido("");
      }
    }
  }, [aberto, encerramentoAtual, abaInicial, totalCalculadoOS]);

  // Atualiza valor sugerido ao mudar tipo de pagamento ou desconto
  const handleMudarTipoPagamento = (novoTipo: TipoPagamentoOS) => {
    setTipoPagamento(novoTipo);
    if (novoTipo === "cortesia") {
      setValorPago(0);
      setDesconto(totalCalculadoOS);
    } else if (novoTipo === "integral") {
      const descNum = Number(desconto) || 0;
      setValorPago(Math.max(0, totalCalculadoOS - descNum));
    }
  };

  const handleMudarDesconto = (novoDesconto: number | "") => {
    setDesconto(novoDesconto);
    const descNum = Number(novoDesconto) || 0;
    if (tipoPagamento === "integral") {
      setValorPago(Math.max(0, totalCalculadoOS - descNum));
    }
  };

  // Cálculo dinâmico do troco em dinheiro
  const trocoCalculado =
    formaPagamento === "dinheiro" &&
    typeof valorDinheiroRecebido === "number" &&
    typeof valorPago === "number" &&
    valorDinheiroRecebido > valorPago
      ? valorDinheiroRecebido - valorPago
      : 0;

  // Fecha o modal ao pressionar a tecla Escape
  useEffect(() => {
    if (!aberto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onFechar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aberto, onFechar]);

  const toggleItem = (item: string, status: "OK" | "Defeito" | "N/V") => {
    setChecklist((prev) => ({
      ...prev,
      [item]: prev[item] === status ? null : status,
    }));
  };

  const marcarTodos = (status: "OK" | "Defeito" | "N/V") => {
    const atualizado: ConferenciaChecklist = {};
    for (const item of ITENS_CHECKLIST_SAIDA) {
      atualizado[item] = status;
    }
    setChecklist(atualizado);
  };

  const [mostrarTesteCarga, setMostrarTesteCarga] = useState(false);
  const [statusBateria, setStatusBateria] = useState<{
    nivel: number | null;
    carregando: boolean | null;
    suportado: boolean;
    testado: boolean;
  }>({ nivel: null, carregando: null, suportado: false, testado: false });

  const registrarResultadoCarregamento = (status: "aprovado" | "reprovado", detalhes?: string) => {
    toggleItem("Carregamento testado e subindo carga", status === "aprovado" ? "OK" : "Defeito");

    setDiagnosticoHardware((prev) => {
      const testesAtuais = { ...(prev?.testes || {}) };
      testesAtuais.charging = {
        id: "charging",
        status,
        dataHora: new Date().toISOString(),
        detalhes:
          detalhes ||
          (status === "aprovado"
            ? "Conector OK · Subindo Carga"
            : "Falha na entrada de energia / conector"),
      };

      const totalAprovados = Object.values(testesAtuais).filter(
        (t) => t.status === "aprovado",
      ).length;
      const totalReprovados = Object.values(testesAtuais).filter(
        (t) => t.status === "reprovado",
      ).length;

      return {
        executadoEm: prev?.executadoEm || new Date().toISOString(),
        aparelhoInfo: prev?.aparelhoInfo || aparelhoModelo,
        testes: testesAtuais,
        observacoes: prev?.observacoes || "",
        totalAprovados,
        totalReprovados,
      };
    });

    toast.success(
      status === "aprovado"
        ? "⚡ Teste de Carregamento APROVADO no Laudo de Hardware!"
        : "✕ Teste de Carregamento registrado com FALHA no Laudo!",
    );
  };

  const executarTesteCarregamento = async () => {
    setMostrarTesteCarga(true);
    if (typeof navigator !== "undefined" && "getBattery" in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        const nivel = Math.round(battery.level * 100);
        const carregando = battery.charging;
        setStatusBateria({
          nivel,
          carregando,
          suportado: true,
          testado: true,
        });

        if (carregando) {
          registrarResultadoCarregamento(
            "aprovado",
            `Conector OK · Bateria ${nivel}% · Carregando`,
          );
        } else {
          toast.info("Aparelho na bateria. Conecte o cabo para detectar subida de carga.");
        }

        const onChargeChange = () => {
          setStatusBateria((prev) => ({
            ...prev,
            carregando: battery.charging,
            nivel: Math.round(battery.level * 100),
            testado: true,
          }));
          if (battery.charging) {
            registrarResultadoCarregamento(
              "aprovado",
              `Cabo conectado · Bateria ${Math.round(battery.level * 100)}% · Carregando`,
            );
          }
        };

        battery.addEventListener("chargingchange", onChargeChange);
      } catch {
        setStatusBateria({ nivel: null, carregando: null, suportado: false, testado: true });
      }
    } else {
      setStatusBateria({ nivel: null, carregando: null, suportado: false, testado: true });
    }
  };

  const contadores = React.useMemo(() => {
    let ok = 0;
    let defeito = 0;
    let nv = 0;
    let pendente = 0;
    for (const item of ITENS_CHECKLIST_SAIDA) {
      const st = checklist[item];
      if (st === "OK") ok++;
      else if (st === "Defeito") defeito++;
      else if (st === "N/V") nv++;
      else pendente++;
    }
    return { ok, defeito, nv, pendente };
  }, [checklist]);

  // Salvar apenas checklist (rascunho)
  const handleSalvarChecklist = async () => {
    setSalvando(true);
    try {
      const novo: EncerramentoOS = {
        checklistSaida: checklist,
        diagnosticoHardware: diagnosticoHardware || null,
        observacoesSaida: obsSaida.trim(),
        encerradoEm: encerramentoAtual?.encerradoEm || new Date().toISOString(),
        pagamento: encerramentoAtual?.pagamento || null,
      };
      await onSalvarEncerramento(novo);
      toast.success("Checklist de saída salvo com sucesso!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar checklist de saída.");
    } finally {
      setSalvando(false);
    }
  };

  // Finalizar a OS com Faturamento e Emissão de Recibo
  const handleConcluirComFaturamento = async () => {
    setConcluindo(true);
    try {
      const valorEfetivo = Number(valorPago) || 0;
      let reciboCriado: ReciboAvulso | null = null;

      // 1. Gera o recibo oficial BR3 Tech caso a opção esteja ativa
      if (gerarRecibo && valorEfetivo >= 0) {
        const proximoNumero = gerarProximoNumeroRecibo();
        const obsFinal = [
          obsPagamento.trim(),
          tipoPagamento === "cortesia" ? "Atendimento sob garantia / cortesia comercial" : "",
          parcelas > 1 && formaPagamento === "cartao_credito"
            ? `Parcelado em ${parcelas}x no cartão de crédito (${moeda(valorEfetivo / parcelas)}/mês)`
            : "",
        ]
          .filter(Boolean)
          .join(" · ");

        reciboCriado = salvarRecibo({
          numero: proximoNumero,
          clienteNome: clienteNome || "Cliente BR3 Tech",
          clienteDocumento: clienteDocumento || undefined,
          clienteTelefone: clienteTelefone || undefined,
          clienteId: clienteId || undefined,
          valor: valorEfetivo,
          valorExtenso: converterParaExtenso(valorEfetivo),
          referente: `Serviços e peças da OS #${osNumero} (${aparelhoModelo})`,
          formaPagamento: formaPagamento,
          dataEmissao: new Date().toISOString(),
          cidade: "Manaus - AM",
          emitenteNome: nomeUsuarioLogado,
          observacoes: obsFinal || undefined,
          modeloImpressao: modeloImpressaoRecibo,
        });

        setReciboGerado(reciboCriado);
        if (onEmitirRecibo) {
          onEmitirRecibo(reciboCriado);
        }
      }

      // 2. Prepara o objeto estruturado de Pagamento
      const dadosPagamento: PagamentoOS = {
        tipo: tipoPagamento,
        forma: formaPagamento,
        valorTotalOS: totalCalculadoOS,
        desconto: Number(desconto) || 0,
        valorPago: valorEfetivo,
        parcelas: formaPagamento === "cartao_credito" ? parcelas : undefined,
        trocoPara:
          formaPagamento === "dinheiro" && typeof valorDinheiroRecebido === "number"
            ? valorDinheiroRecebido
            : undefined,
        observacoes: obsPagamento.trim() || undefined,
        dataPagamento: new Date().toISOString(),
        reciboNumero: reciboCriado?.numero,
        reciboId: reciboCriado?.id,
        reciboEmitido: !!reciboCriado,
      };

      // 3. Salva encerramento com checklist + pagamento na OS
      const novoEncerramento: EncerramentoOS = {
        checklistSaida: checklist,
        diagnosticoHardware: diagnosticoHardware || null,
        observacoesSaida: obsSaida.trim(),
        encerradoEm: new Date().toISOString(),
        tecnicoNome: nomeUsuarioLogado,
        pagamento: dadosPagamento,
      };

      await onSalvarEncerramento(novoEncerramento);

      // 4. Se a OS pode ser concluída (status !== entregue), dispara a transição
      if (podeConcluirOS && onConcluirOS) {
        await onConcluirOS(dadosPagamento);
      }

      toast.success(
        reciboCriado
          ? `OS #${osNumero} faturada e concluída! Recibo ${reciboCriado.numero} gerado.`
          : `OS #${osNumero} faturada e concluída com sucesso!`,
      );

      // 5. Muda para a aba de confirmação e emissão de documentos
      setAbaModal("concluido");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao concluir ordem de serviço e faturamento.");
    } finally {
      setConcluindo(false);
    }
  };

  if (!aberto) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto cursor-pointer"
        onClick={onFechar}
      >
        <div
          className="relative w-full max-w-3xl rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[94vh] overflow-y-auto cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span>Encerramento e Faturamento da OS</span>
                <span className="font-mono text-xs text-primary px-2 py-0.5 rounded bg-primary/10">
                  #{osNumero}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Equipamento: <strong>{aparelhoModelo}</strong>
                {clienteNome && (
                  <span>
                    {" "}
                    · Cliente: <strong>{clienteNome}</strong>
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {abaModal === "checklist" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarQrCodeModal(!mostrarQrCodeModal)}
                  className="gap-1.5 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10"
                >
                  <QrCode className="h-4 w-4" />
                  <span>{mostrarQrCodeModal ? "Ocultar QR Code" : "QR Code Saída"}</span>
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onFechar}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Abas Superiores de Navegação */}
          <div className="flex border-b border-border/80 gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setAbaModal("checklist")}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                abaModal === "checklist"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>1. Checklist & Hardware</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary font-mono">
                {contadores.ok}/{ITENS_CHECKLIST_SAIDA.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAbaModal("faturamento")}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                abaModal === "faturamento"
                  ? "border-emerald-500 text-emerald-500"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>2. Faturamento & Pagamento</span>
              {pagamentoExistente && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                  Quitado
                </span>
              )}
            </button>

            {(reciboGerado || pagamentoExistente?.reciboNumero || abaModal === "concluido") && (
              <button
                type="button"
                onClick={() => setAbaModal("concluido")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  abaModal === "concluido"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>3. Recibo & Documentos</span>
              </button>
            )}
          </div>

          {/* ========================================================================= */}
          {/* ABA 1: CHECKLIST DE SAÍDA E TESTES DE HARDWARE                            */}
          {/* ========================================================================= */}
          {abaModal === "checklist" && (
            <div className="space-y-4">
              {/* Painel do QR Code */}
              {mostrarQrCodeModal && (
                <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="shrink-0 bg-white p-3 rounded-2xl shadow-xl border-2 border-slate-300 flex flex-col items-center">
                      <QRCodeSVG value={urlDiagnostico} size={180} />
                      <span className="text-[10px] font-mono text-slate-800 mt-2 font-bold px-2 py-0.5 bg-slate-100 rounded">
                        {urlBase}
                      </span>
                    </div>
                    <div className="space-y-2 text-center sm:text-left flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
                        <button
                          type="button"
                          onClick={() => setModoQrCode("checklist")}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                            modoQrCode === "checklist"
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          <span>Checklist de Inspeção de Saída</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoQrCode("hardware")}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                            modoQrCode === "hardware"
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          <Zap className="h-3.5 w-3.5" />
                          <span>Testes de Hardware</span>
                        </button>
                      </div>

                      <h3 className="text-sm font-bold text-foreground">
                        {modoQrCode === "checklist"
                          ? "Aponte a câmera para abrir o Checklist de Inspeção de Saída"
                          : "Aponte a câmera para abrir a Suíte de Testes de Hardware"}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {modoQrCode === "checklist"
                          ? "Abre diretamente na tela do aparelho a conferência dos 14 itens para marcar OK ou Defeito com 1 toque."
                          : "Abre a suíte de testes de hardware: Display, Touch Grid, Som, Microfone e Sensores."}
                      </p>

                      {(hostnameAtual === "localhost" || hostnameAtual === "127.0.0.1") && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] text-muted-foreground font-medium">Link:</span>
                          <button
                            type="button"
                            onClick={() => setUsarIpRede(true)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                              usarIpRede
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                            }`}
                          >
                            IP Wi-Fi ({ipRedeLocal})
                          </button>
                          <button
                            type="button"
                            onClick={() => setUsarIpRede(false)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                              !usarIpRede
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                            }`}
                          >
                            Localhost
                          </button>
                        </div>
                      )}

                      {sessionAuth && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-emerald-400 font-semibold select-none">
                            <input
                              type="checkbox"
                              checked={incluirLoginAutomatico}
                              onChange={(e) => setIncluirLoginAutomatico(e.target.checked)}
                              className="rounded border-border bg-background text-primary focus:ring-primary h-3.5 w-3.5 accent-primary"
                            />
                            <span>Login Automático via QR Code (Sem digitar senha)</span>
                          </label>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 pt-1.5">
                        <input
                          type="text"
                          readOnly
                          value={urlDiagnostico}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-[11px] font-mono select-all text-muted-foreground"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(urlDiagnostico);
                            toast.success("Link do teste copiado!");
                          }}
                          className="text-xs h-7 px-2"
                        >
                          Copiar
                        </Button>
                        <Button asChild size="sm" variant="outline" className="text-xs gap-1 h-7 px-2">
                          <a href={urlDiagnostico} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3 w-3" /> Testar
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Laudo de Testes de Hardware */}
              {diagnosticoHardware && Object.keys(diagnosticoHardware.testes).length > 0 && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Laudo de Testes de Hardware
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {diagnosticoHardware.totalAprovados} aprovados · {diagnosticoHardware.totalReprovados} reprovados
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {Object.entries(diagnosticoHardware.testes).map(([testeId, res]) => (
                      <div
                        key={testeId}
                        className={`p-1.5 rounded-lg border text-[11px] font-medium flex items-center justify-between ${
                          res.status === "aprovado"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                            : res.status === "reprovado"
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span className="capitalize">{testeId.replace("_", " ")}</span>
                        <span className="font-bold">
                          {res.status === "aprovado" ? "✓" : res.status === "reprovado" ? "✕" : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grade dos 14 Itens de Inspeção */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                      Itens de Inspeção de Saída ({ITENS_CHECKLIST_SAIDA.length})
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-semibold text-emerald-500">{contadores.ok} OK</span>
                    {contadores.defeito > 0 && (
                      <span className="text-xs font-semibold text-rose-500">
                        {contadores.defeito} Defeito
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => marcarTodos("OK")}
                      className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 hover:bg-emerald-500/20 cursor-pointer"
                    >
                      Marcar Todos OK
                    </button>
                    <button
                      type="button"
                      onClick={() => marcarTodos("N/V")}
                      className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Todos N/V
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[35vh] overflow-y-auto p-1 border rounded-xl border-border/80 bg-background/50">
                  {ITENS_CHECKLIST_SAIDA.map((item) => {
                    const status = checklist[item];
                    const isOk = status === "OK";
                    const isDefeito = status === "Defeito";
                    const isNV = status === "N/V";

                    return (
                      <div
                        key={item}
                        className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs transition-colors ${
                          isOk
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : isDefeito
                              ? "border-rose-500/40 bg-rose-500/5"
                              : isNV
                                ? "border-border bg-muted/30 text-muted-foreground"
                                : "border-border/60 bg-card hover:bg-secondary/40"
                        }`}
                      >
                        <span className="font-medium text-foreground truncate pr-1" title={item}>
                          {item}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {item === "Carregamento testado e subindo carga" && (
                            <button
                              type="button"
                              onClick={executarTesteCarregamento}
                              className="h-7 px-1.5 rounded flex items-center gap-1 text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors cursor-pointer mr-0.5"
                              title="Acionar detector de carregamento"
                            >
                              <Zap className="h-3 w-3 fill-current" />
                              <span className="hidden sm:inline">Testar</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleItem(item, "OK")}
                            className={`h-7 w-7 rounded flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${
                              isOk
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-secondary text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-500"
                            }`}
                            title="Item Aprovado"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleItem(item, "Defeito")}
                            className={`h-7 w-7 rounded flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${
                              isDefeito
                                ? "bg-rose-600 text-white shadow-sm"
                                : "bg-secondary text-muted-foreground hover:bg-rose-500/20 hover:text-rose-500"
                            }`}
                            title="Item com Defeito"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleItem(item, "N/V")}
                            className={`h-7 w-7 rounded flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${
                              isNV
                                ? "bg-slate-600 text-white shadow-sm"
                                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                            }`}
                            title="Não verificado"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Observações da Saída */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">
                  Observações Técnicas do Encerramento:
                </label>
                <textarea
                  rows={2}
                  value={obsSaida}
                  onChange={(e) => setObsSaida(e.target.value)}
                  placeholder="Ex: Peça original instalada; aparelho higienizado e entregue com 90 dias de garantia..."
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Rodapé da Aba Checklist */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onFechar}
                  className="text-xs cursor-pointer font-semibold"
                >
                  Fechar
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={salvando}
                    onClick={handleSalvarChecklist}
                    className="text-xs gap-1.5 font-bold"
                  >
                    <Save className="h-3.5 w-3.5 text-primary" />
                    <span>Salvar Checklist</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setAbaModal("faturamento")}
                    className="text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 cursor-pointer"
                  >
                    <span>Avançar para Faturamento</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: MENU DE FATURAMENTO E PAGAMENTO DA OS                              */}
          {/* ========================================================================= */}
          {abaModal === "faturamento" && (
            <div className="space-y-4">
              {/* Resumo Financeiro da OS */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">
                    Resumo do Orçamento da OS
                  </span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Peças: <strong>{moeda(valorPecas)}</strong></span>
                    <span>·</span>
                    <span>Mão de obra: <strong>{moeda(valorMaoObra)}</strong></span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block font-medium">Total dos Serviços</span>
                  <span className="text-xl font-extrabold text-emerald-500">
                    {moeda(totalCalculadoOS)}
                  </span>
                </div>
              </div>

              {/* 1. Tipo de Pagamento */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-primary" />
                  <span>Tipo de Pagamento / Lançamento:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: "integral", label: "Quitação Integral", desc: "Valor total da OS" },
                      { id: "parcial", label: "Pagamento Parcial", desc: "Parte do valor" },
                      { id: "sinal", label: "Entrada / Sinal", desc: "Adiantamento" },
                      { id: "cortesia", label: "Garantia / Cortesia", desc: "Sem custo (R$ 0)" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleMudarTipoPagamento(t.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        tipoPagamento === t.id
                          ? "border-emerald-500 bg-emerald-500/15 text-foreground ring-1 ring-emerald-500 shadow-sm"
                          : "border-border bg-card hover:bg-secondary/60 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-foreground">{t.label}</span>
                        {tipoPagamento === t.id && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground block">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Forma de Pagamento */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>Forma de Pagamento:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(
                    [
                      { id: "pix", label: "PIX", icon: Zap, destaque: true },
                      { id: "dinheiro", label: "Dinheiro", icon: Banknote },
                      { id: "cartao_credito", label: "Crédito", icon: CreditCard },
                      { id: "cartao_debito", label: "Débito", icon: CreditCard },
                      { id: "transferencia", label: "TED / Transf.", icon: Building },
                    ] as const
                  ).map((f) => {
                    const Icon = f.icon;
                    const isSelected = formaPagamento === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFormaPagamento(f.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                          isSelected
                            ? "border-primary bg-primary/15 text-primary ring-1 ring-primary shadow-sm font-bold"
                            : "border-border bg-card hover:bg-secondary/60 text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs">{f.label}</span>
                        {f.destaque && (
                          <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-500">
                            Instantâneo
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Campos Condicionais: Dinheiro (troco) ou Cartão de Crédito (parcelas) */}
              {formaPagamento === "dinheiro" && (
                <div className="rounded-xl border border-border bg-secondary/30 p-3 flex flex-wrap items-center gap-4 text-xs">
                  <div className="space-y-1 flex-1 min-w-[200px]">
                    <label className="font-semibold text-foreground">
                      Valor entregue pelo cliente em dinheiro (R$):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorDinheiroRecebido}
                      onChange={(e) =>
                        setValorDinheiroRecebido(
                          e.target.value === "" ? "" : parseFloat(e.target.value),
                        )
                      }
                      placeholder="Ex: 200,00"
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                  {trocoCalculado > 0 && (
                    <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 font-bold shrink-0">
                      <span>Troco a devolver: </span>
                      <strong className="text-sm">{moeda(trocoCalculado)}</strong>
                    </div>
                  )}
                </div>
              )}

              {formaPagamento === "cartao_credito" && (
                <div className="rounded-xl border border-border bg-secondary/30 p-3 flex flex-wrap items-center gap-4 text-xs">
                  <div className="space-y-1 flex-1 min-w-[200px]">
                    <label className="font-semibold text-foreground">Número de Parcelas:</label>
                    <select
                      value={parcelas}
                      onChange={(e) => setParcelas(parseInt(e.target.value, 10))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((p) => {
                        const valNum = Number(valorPago) || 0;
                        const valParc = p > 0 ? valNum / p : valNum;
                        return (
                          <option key={p} value={p}>
                            {p === 1 ? "1x à vista" : `${p}x de ${moeda(valParc)} sem juros`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}

              {/* 3. Valores e Desconto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Valor Efetivo do Pagamento (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorPago}
                    onChange={(e) =>
                      setValorPago(e.target.value === "" ? "" : parseFloat(e.target.value))
                    }
                    className="w-full rounded-lg border border-border bg-background p-2.5 text-sm font-bold font-mono text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Desconto Concedido (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={desconto}
                    onChange={(e) =>
                      handleMudarDesconto(e.target.value === "" ? "" : parseFloat(e.target.value))
                    }
                    placeholder="0,00"
                    className="w-full rounded-lg border border-border bg-background p-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Valor por Extenso em tempo real */}
              <div className="p-2.5 rounded-lg border border-border/80 bg-background/60 text-xs flex items-center gap-2">
                <span className="text-muted-foreground font-medium shrink-0">Valor por extenso:</span>
                <span className="font-semibold text-foreground italic">
                  {converterParaExtenso(Number(valorPago) || 0)}
                </span>
              </div>

              {/* 4. Opção de Emissão de Recibo */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-foreground select-none">
                    <input
                      type="checkbox"
                      checked={gerarRecibo}
                      onChange={(e) => setGerarRecibo(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 accent-primary"
                    />
                    <span>Emitir Recibo de Pagamento Oficial BR3 Tech</span>
                  </label>

                  {gerarRecibo && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-muted-foreground">Formato:</span>
                      <select
                        value={modeloImpressaoRecibo}
                        onChange={(e) => setModeloImpressaoRecibo(e.target.value as any)}
                        className="rounded border border-border bg-background px-2 py-0.5 font-medium text-xs cursor-pointer"
                      >
                        <option value="duas_vias">2 Vias (Cliente e Loja)</option>
                        <option value="pagina_unica">Página Única (A4)</option>
                        <option value="termica_80mm">Cupom Térmico (80mm)</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Observações / Anotações do Pagamento e Recibo (opcional):
                  </label>
                  <input
                    type="text"
                    value={obsPagamento}
                    onChange={(e) => setObsPagamento(e.target.value)}
                    placeholder="Ex: Pagamento integral via PIX no ato da retirada; 90 dias de garantia..."
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Rodapé da Aba Faturamento */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAbaModal("checklist")}
                  className="text-xs gap-1.5 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Voltar ao Checklist</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={concluindo || salvando}
                    onClick={handleConcluirComFaturamento}
                    className="text-xs gap-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 px-4 py-2 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {podeConcluirOS ? "Concluir OS e Emitir Recibo" : "Salvar Dados de Pagamento"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: CONFIRMAÇÃO DE CONCLUSÃO E EMISSÃO DE DOCUMENTOS                   */}
          {/* ========================================================================= */}
          {abaModal === "concluido" && (
            <div className="space-y-5 py-2">
              <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-5 text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-extrabold text-foreground">
                  Ordem de Serviço #{osNumero} Concluída com Sucesso!
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Aparelho <strong>{aparelhoModelo}</strong> finalizado com inspeção de saída aprovada
                  e pagamento registrado.
                </p>

                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-card border border-emerald-500/30 text-xs font-semibold shadow-sm mt-2">
                  <span>
                    Valor Pago: <strong className="text-emerald-500">{moeda(Number(valorPago) || 0)}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Forma: <strong>{FORMAS_PAGAMENTO_LABELS[formaPagamento]}</strong>
                  </span>
                  {reciboGerado && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-primary font-bold">
                        Recibo: {reciboGerado.numero}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Grade de Documentos Disponíveis para Emissão */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wide block">
                  Documentos Oficiais Prontos para Emissão:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Botão 1: Recibo de Pagamento */}
                  {reciboGerado && (
                    <button
                      type="button"
                      onClick={() => setModalReciboVisualizarAberto(true)}
                      className="p-4 rounded-xl border-2 border-emerald-500/40 bg-card hover:bg-emerald-500/5 text-left transition-all shadow-sm flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">
                            Recibo de Pagamento ({reciboGerado.numero})
                          </span>
                          <span className="text-[10px] text-emerald-500 font-bold">Abrir ➔</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Imprima em 2 vias (Loja e Cliente), página única A4 ou cupom térmico 80mm.
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Botão 2: Enviar no WhatsApp */}
                  {clienteTelefone && reciboGerado && (
                    <a
                      href={linkWhatsApp(clienteTelefone, gerarTextoWhatsAppRecibo(reciboGerado))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-xl border border-border bg-card hover:bg-emerald-500/5 text-left transition-all shadow-sm flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-emerald-600/15 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">
                            Enviar Comprovante no WhatsApp
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold">Enviar ➔</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Envia o texto detalhado do recibo direto para {clienteTelefone}.
                        </p>
                      </div>
                    </a>
                  )}
                </div>
              </div>

              {/* Rodapé de Saída */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAbaModal("faturamento")}
                  className="text-xs gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Revisar Faturamento</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={onFechar}
                  className="text-xs gap-1.5 font-bold bg-primary text-primary-foreground px-5 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Concluir e Fechar</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Impressão do Recibo Oficial */}
      {reciboGerado && (
        <ReciboImpressoModal
          aberto={modalReciboVisualizarAberto}
          onFechar={() => setModalReciboVisualizarAberto(false)}
          recibo={reciboGerado}
        />
      )}
    </>
  );
}

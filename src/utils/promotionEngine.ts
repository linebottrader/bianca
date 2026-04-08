/**
 * Promotion Engine — centralized, priority-based promotion resolution.
 *
 * Receives all relevant data and returns which promotion to apply,
 * which were rejected, and the final discount values.
 */

export type PromoCandidate = {
  tipo: string;        // "cupom" | "relampago" | "dia_semana" | "happy_hour" | "progressivo" | "frete_gratis"
  label: string;       // Human-readable label
  valor: number;       // Discount amount in R$
  isFreteGratis: boolean;
  priority: number;    // Lower = higher priority
};

export type PromotionResult = {
  appliedPromo: PromoCandidate | null;
  rejectedPromos: PromoCandidate[];
  finalDiscount: number;
  isFreteGratis: boolean;
  tipoPromocaoAplicada: string | null;
};

export type RegrasConfig = {
  desconto_maximo_percentual: number;
  permite_acumular: boolean;
  prioridades: Record<string, number>;
};

const DEFAULT_REGRAS: RegrasConfig = {
  desconto_maximo_percentual: 40,
  permite_acumular: false,
  prioridades: {
    cupom: 1,
    relampago: 2,
    dia_semana: 3,
    happy_hour: 4,
    progressivo: 5,
    frete_gratis: 6,
  },
};

type PromoConfigData = {
  desconto_progressivo?: any;
  happy_hour?: any;
  promo_dia_semana?: any;
  promo_relampago?: any;
  frete_gratis_auto?: any;
  regras_prioridade?: any;
};

type CouponData = {
  tipo_desconto: string;
  valor_desconto: number;
  codigo: string;
  nome_promocao: string;
} | null;

export function resolvePromotions({
  subtotal,
  promoConfig,
  validatedCoupon,
}: {
  subtotal: number;
  promoConfig: PromoConfigData | null;
  validatedCoupon: CouponData;
}): PromotionResult {
  const regras: RegrasConfig = {
    ...DEFAULT_REGRAS,
    ...(promoConfig?.regras_prioridade || {}),
    prioridades: {
      ...DEFAULT_REGRAS.prioridades,
      ...(promoConfig?.regras_prioridade?.prioridades || {}),
    },
  };

  const candidates: PromoCandidate[] = [];

  // 1. Manual coupon
  if (validatedCoupon) {
    let valor = 0;
    let isFreteGratis = false;
    if (validatedCoupon.tipo_desconto === "percentual") {
      valor = subtotal * (validatedCoupon.valor_desconto / 100);
    } else if (validatedCoupon.tipo_desconto === "valor_fixo") {
      valor = Math.min(validatedCoupon.valor_desconto, subtotal);
    } else if (validatedCoupon.tipo_desconto === "frete_gratis") {
      isFreteGratis = true;
    }
    candidates.push({
      tipo: "cupom",
      label: `Cupom ${validatedCoupon.codigo}`,
      valor,
      isFreteGratis,
      priority: regras.prioridades.cupom ?? 1,
    });
  }

  if (promoConfig) {
    // 2. Flash promo (relampago)
    const pr = promoConfig.promo_relampago;
    if (pr?.ativo && pr.inicio) {
      const start = new Date(pr.inicio);
      const end = new Date(start.getTime() + (pr.duracao_minutos || 30) * 60000);
      const now = new Date();
      if (now >= start && now < end) {
        const desc = pr.desconto || 20;
        candidates.push({
          tipo: "relampago",
          label: `Promoção Relâmpago (${desc}% OFF)`,
          valor: subtotal * (desc / 100),
          isFreteGratis: false,
          priority: regras.prioridades.relampago ?? 2,
        });
      }
    }

    // 3. Weekday promo
    const pds = promoConfig.promo_dia_semana;
    if (pds?.ativo && new Date().getDay() === (pds.dia ?? -1)) {
      const desc = pds.desconto || 20;
      candidates.push({
        tipo: "dia_semana",
        label: `Promoção do dia (${desc}% OFF)`,
        valor: subtotal * (desc / 100),
        isFreteGratis: false,
        priority: regras.prioridades.dia_semana ?? 3,
      });
    }

    // 4. Happy hour
    const hh = promoConfig.happy_hour;
    if (hh?.ativo) {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const [sH, sM] = (hh.hora_inicio || "14:00").split(":").map(Number);
      const [eH, eM] = (hh.hora_fim || "17:00").split(":").map(Number);
      if (currentMin >= sH * 60 + sM && currentMin < eH * 60 + eM) {
        const desc = hh.desconto || 10;
        candidates.push({
          tipo: "happy_hour",
          label: `Happy Hour (${desc}% OFF)`,
          valor: subtotal * (desc / 100),
          isFreteGratis: false,
          priority: regras.prioridades.happy_hour ?? 4,
        });
      }
    }

    // 5. Progressive discount
    const dp = promoConfig.desconto_progressivo;
    if (dp?.ativo && dp.faixas?.length) {
      const sorted = [...dp.faixas].sort((a: any, b: any) => b.valor_minimo - a.valor_minimo);
      const match = sorted.find((f: any) => subtotal >= f.valor_minimo);
      if (match) {
        candidates.push({
          tipo: "progressivo",
          label: `Desconto progressivo (${match.desconto}%)`,
          valor: subtotal * (match.desconto / 100),
          isFreteGratis: false,
          priority: regras.prioridades.progressivo ?? 5,
        });
      }
    }

    // 6. Auto free shipping
    const fga = promoConfig.frete_gratis_auto;
    if (fga?.ativo && subtotal >= (fga.valor_minimo || 999999)) {
      candidates.push({
        tipo: "frete_gratis",
        label: "Frete grátis automático",
        valor: 0,
        isFreteGratis: true,
        priority: regras.prioridades.frete_gratis ?? 6,
      });
    }
  }

  // No candidates
  if (candidates.length === 0) {
    return { appliedPromo: null, rejectedPromos: [], finalDiscount: 0, isFreteGratis: false, tipoPromocaoAplicada: null };
  }

  // Sort by priority (lower number = higher priority)
  candidates.sort((a, b) => a.priority - b.priority);

  let applied: PromoCandidate[];
  let rejected: PromoCandidate[];

  if (regras.permite_acumular) {
    // All apply
    applied = [...candidates];
    rejected = [];
  } else {
    // Only the highest-priority discount promo applies.
    // Exception: frete_gratis can coexist with a discount promo since they affect different things.
    const discountPromos = candidates.filter(c => !c.isFreteGratis);
    const fretePromos = candidates.filter(c => c.isFreteGratis);

    const topDiscount = discountPromos.length > 0 ? [discountPromos[0]] : [];
    const topFrete = fretePromos.length > 0 ? [fretePromos[0]] : [];

    applied = [...topDiscount, ...topFrete];
    rejected = candidates.filter(c => !applied.includes(c));
  }

  // Calculate total discount
  let totalDiscountVal = applied.reduce((sum, p) => sum + p.valor, 0);

  // Cap at max percentage
  const maxDiscount = subtotal * (regras.desconto_maximo_percentual / 100);
  totalDiscountVal = Math.min(totalDiscountVal, maxDiscount);

  // Never exceed subtotal
  totalDiscountVal = Math.min(totalDiscountVal, subtotal);

  const isFreteGratis = applied.some(p => p.isFreteGratis);
  const mainPromo = applied.find(p => !p.isFreteGratis) || applied[0] || null;

  return {
    appliedPromo: mainPromo,
    rejectedPromos: rejected,
    finalDiscount: Math.round(totalDiscountVal * 100) / 100,
    isFreteGratis,
    tipoPromocaoAplicada: mainPromo?.tipo || (isFreteGratis ? "frete_gratis" : null),
  };
}

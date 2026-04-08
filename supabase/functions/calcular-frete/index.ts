import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FreteConfig {
  endereco_loja: string;
  api_provider: string;
  api_key: string;
  valor_base: number;
  valor_por_km: number;
}

interface GeoResult {
  lng: number;
  lat: number;
}

async function geocodeMapbox(address: string, apiKey: string): Promise<GeoResult> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${apiKey}&limit=1&country=br`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = await res.json();
  if (!data.features || data.features.length === 0) {
    throw new Error(`Endereço não encontrado: ${address}`);
  }
  const [lng, lat] = data.features[0].center;
  return { lng, lat };
}

async function distanceMapbox(origin: GeoResult, dest: GeoResult, apiKey: string): Promise<number> {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?access_token=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Directions API failed: ${res.status}`);
  const data = await res.json();
  if (!data.routes || data.routes.length === 0) {
    throw new Error("Rota não encontrada entre os endereços.");
  }
  return data.routes[0].distance; // meters
}

async function calculateDistance(config: FreteConfig, enderecoCliente: string): Promise<number> {
  if (config.api_provider === "mapbox") {
    const origin = await geocodeMapbox(config.endereco_loja, config.api_key);
    const dest = await geocodeMapbox(enderecoCliente, config.api_key);
    const meters = await distanceMapbox(origin, dest, config.api_key);
    return meters / 1000;
  }
  // Future providers
  throw new Error(`Provider não suportado: ${config.api_provider}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endereco_cliente } = await req.json();
    if (!endereco_cliente || typeof endereco_cliente !== "string" || endereco_cliente.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "Endereço do cliente inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: freteConfig, error: cfgErr } = await supabase
      .from("configuracao_frete")
      .select("*")
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    if (cfgErr) throw cfgErr;
    if (!freteConfig) {
      return new Response(
        JSON.stringify({ error: "Configuração de frete não encontrada." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prefer env secret over DB value for API key security
    const apiKey = Deno.env.get("MAPBOX_API_KEY") || freteConfig.api_key;

    if (!apiKey || !freteConfig.endereco_loja) {
      return new Response(
        JSON.stringify({ error: "Configuração de frete incompleta. Configure no painel admin." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secureConfig: FreteConfig = { ...freteConfig, api_key: apiKey };
    const distanciaKm = await calculateDistance(secureConfig, endereco_cliente.trim());
    const valorFrete = Math.max(0, Math.round((freteConfig.valor_base + distanciaKm * freteConfig.valor_por_km) * 100) / 100);

    return new Response(
      JSON.stringify({
        distanciaKm: Math.round(distanciaKm * 100) / 100,
        valorFrete,
        apiProvider: freteConfig.api_provider,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Erro calcular-frete:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro ao calcular frete." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

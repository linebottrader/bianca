export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          cliente_id: string | null
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      aniversario_config: {
        Row: {
          ativo: boolean
          desconto_percentual: number
          envio_automatico: boolean
          id: string
          mensagem_whatsapp: string
          updated_at: string | null
          validade_horas: number
        }
        Insert: {
          ativo?: boolean
          desconto_percentual?: number
          envio_automatico?: boolean
          id?: string
          mensagem_whatsapp?: string
          updated_at?: string | null
          validade_horas?: number
        }
        Update: {
          ativo?: boolean
          desconto_percentual?: number
          envio_automatico?: boolean
          id?: string
          mensagem_whatsapp?: string
          updated_at?: string | null
          validade_horas?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          disponivel: boolean
          id: string
          name: string
          slug: string
          sort_order: number
          visivel: boolean
        }
        Insert: {
          created_at?: string | null
          disponivel?: boolean
          id?: string
          name: string
          slug: string
          sort_order?: number
          visivel?: boolean
        }
        Update: {
          created_at?: string | null
          disponivel?: boolean
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          visivel?: boolean
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cpf: string | null
          created_at: string
          data_nascimento: string
          email: string | null
          endereco: string
          id: string
          nome_completo: string
          telefone: string
          user_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          data_nascimento: string
          email?: string | null
          endereco: string
          id?: string
          nome_completo: string
          telefone: string
          user_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          data_nascimento?: string
          email?: string | null
          endereco?: string
          id?: string
          nome_completo?: string
          telefone?: string
          user_id?: string
        }
        Relationships: []
      }
      configuracao_frete: {
        Row: {
          api_key: string
          api_provider: string
          ativo: boolean
          endereco_loja: string
          id: string
          updated_at: string | null
          valor_base: number
          valor_por_km: number
        }
        Insert: {
          api_key?: string
          api_provider?: string
          ativo?: boolean
          endereco_loja?: string
          id?: string
          updated_at?: string | null
          valor_base?: number
          valor_por_km?: number
        }
        Update: {
          api_key?: string
          api_provider?: string
          ativo?: boolean
          endereco_loja?: string
          id?: string
          updated_at?: string | null
          valor_base?: number
          valor_por_km?: number
        }
        Relationships: []
      }
      configuracao_pix: {
        Row: {
          chave_pix: string
          id: string
          nome_recebedor: string
          qr_code_url: string
          updated_at: string | null
        }
        Insert: {
          chave_pix?: string
          id?: string
          nome_recebedor?: string
          qr_code_url?: string
          updated_at?: string | null
        }
        Update: {
          chave_pix?: string
          id?: string
          nome_recebedor?: string
          qr_code_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      configuracoes_impressao: {
        Row: {
          ativo: boolean
          created_at: string
          fonte_negrito: boolean
          fonte_obs_cor: string
          fonte_obs_tamanho: string
          fonte_tamanho: string
          id: string
          impressao_automatica: boolean
          largura_papel: string
          metodo_impressao: string
          nome_impressora: string
          som_novo_pedido_ativo: boolean | null
          som_novo_pedido_url: string
          som_repetir: boolean
          som_volume: number
          tipo_impressora: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          fonte_negrito?: boolean
          fonte_obs_cor?: string
          fonte_obs_tamanho?: string
          fonte_tamanho?: string
          id?: string
          impressao_automatica?: boolean
          largura_papel?: string
          metodo_impressao?: string
          nome_impressora?: string
          som_novo_pedido_ativo?: boolean | null
          som_novo_pedido_url?: string
          som_repetir?: boolean
          som_volume?: number
          tipo_impressora?: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          fonte_negrito?: boolean
          fonte_obs_cor?: string
          fonte_obs_tamanho?: string
          fonte_tamanho?: string
          id?: string
          impressao_automatica?: boolean
          largura_papel?: string
          metodo_impressao?: string
          nome_impressora?: string
          som_novo_pedido_ativo?: boolean | null
          som_novo_pedido_url?: string
          som_repetir?: boolean
          som_volume?: number
          tipo_impressora?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cupons: {
        Row: {
          codigo: string
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          limite_por_cliente: number
          limite_total_uso: number
          nome_promocao: string
          status: boolean
          tipo_desconto: string
          usos_atuais: number
          valor_desconto: number
          valor_minimo_pedido: number
        }
        Insert: {
          codigo: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          limite_por_cliente?: number
          limite_total_uso?: number
          nome_promocao?: string
          status?: boolean
          tipo_desconto?: string
          usos_atuais?: number
          valor_desconto?: number
          valor_minimo_pedido?: number
        }
        Update: {
          codigo?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          limite_por_cliente?: number
          limite_total_uso?: number
          nome_promocao?: string
          status?: boolean
          tipo_desconto?: string
          usos_atuais?: number
          valor_desconto?: number
          valor_minimo_pedido?: number
        }
        Relationships: []
      }
      cupons_aniversario: {
        Row: {
          ano: number
          cliente_id: string
          codigo: string
          created_at: string
          desconto: number
          id: string
          usado: boolean
          validade: string
          whatsapp_enviado: boolean
        }
        Insert: {
          ano: number
          cliente_id: string
          codigo: string
          created_at?: string
          desconto?: number
          id?: string
          usado?: boolean
          validade: string
          whatsapp_enviado?: boolean
        }
        Update: {
          ano?: number
          cliente_id?: string
          codigo?: string
          created_at?: string
          desconto?: number
          id?: string
          usado?: boolean
          validade?: string
          whatsapp_enviado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cupons_aniversario_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cupons_usados: {
        Row: {
          cliente_id: string
          cupom_id: string
          data_uso: string
          id: string
          pedido_id: string | null
          valor_desconto: number
        }
        Insert: {
          cliente_id: string
          cupom_id: string
          data_uso?: string
          id?: string
          pedido_id?: string | null
          valor_desconto?: number
        }
        Update: {
          cliente_id?: string
          cupom_id?: string
          data_uso?: string
          id?: string
          pedido_id?: string | null
          valor_desconto?: number
        }
        Relationships: [
          {
            foreignKeyName: "cupons_usados_cupom_id_fkey"
            columns: ["cupom_id"]
            isOneToOne: false
            referencedRelation: "cupons"
            referencedColumns: ["id"]
          },
        ]
      }
      enderecos_cliente: {
        Row: {
          bairro: string
          cep: string
          cidade: string
          cliente_id: string
          complemento: string | null
          created_at: string
          id: string
          numero: string
          referencia: string | null
          rua: string
        }
        Insert: {
          bairro?: string
          cep?: string
          cidade?: string
          cliente_id: string
          complemento?: string | null
          created_at?: string
          id?: string
          numero?: string
          referencia?: string | null
          rua?: string
        }
        Update: {
          bairro?: string
          cep?: string
          cidade?: string
          cliente_id?: string
          complemento?: string | null
          created_at?: string
          id?: string
          numero?: string
          referencia?: string | null
          rua?: string
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      entregadores: {
        Row: {
          data_cadastro: string
          id: string
          nome: string
          status: string
          telefone: string
          updated_at: string | null
        }
        Insert: {
          data_cadastro?: string
          id?: string
          nome: string
          status?: string
          telefone?: string
          updated_at?: string | null
        }
        Update: {
          data_cadastro?: string
          id?: string
          nome?: string
          status?: string
          telefone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      holidays: {
        Row: {
          close_time: string | null
          created_at: string
          date: string
          id: string
          is_open: boolean
          name: string
          open_time: string | null
        }
        Insert: {
          close_time?: string | null
          created_at?: string
          date: string
          id?: string
          is_open?: boolean
          name?: string
          open_time?: string | null
        }
        Update: {
          close_time?: string | null
          created_at?: string
          date?: string
          id?: string
          is_open?: boolean
          name?: string
          open_time?: string | null
        }
        Relationships: []
      }
      itens_pedido: {
        Row: {
          created_at: string
          id: string
          observacoes: string | null
          pedido_id: string
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          subtotal: number
        }
        Insert: {
          created_at?: string
          id?: string
          observacoes?: string | null
          pedido_id: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          subtotal?: number
        }
        Update: {
          created_at?: string
          id?: string
          observacoes?: string | null
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      kds_config: {
        Row: {
          created_at: string
          estacoes: string[]
          id: string
          modo_estacao: string
          mostrar_aguardando_entregador: boolean
          som_novo_pedido: boolean
          tempo_alerta_minutos: number
          updated_at: string | null
          voz_novo_pedido: boolean
        }
        Insert: {
          created_at?: string
          estacoes?: string[]
          id?: string
          modo_estacao?: string
          mostrar_aguardando_entregador?: boolean
          som_novo_pedido?: boolean
          tempo_alerta_minutos?: number
          updated_at?: string | null
          voz_novo_pedido?: boolean
        }
        Update: {
          created_at?: string
          estacoes?: string[]
          id?: string
          modo_estacao?: string
          mostrar_aguardando_entregador?: boolean
          som_novo_pedido?: boolean
          tempo_alerta_minutos?: number
          updated_at?: string | null
          voz_novo_pedido?: boolean
        }
        Relationships: []
      }
      maintenance_mode: {
        Row: {
          id: string
          is_active: boolean
          message: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean
          message?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean
          message?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          badges: string[] | null
          category_id: string
          created_at: string | null
          description: string | null
          disponivel: boolean
          estacao_preparo: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          original_price: number | null
          price: number
          sort_order: number
          tempo_preparo: number | null
          updated_at: string | null
          visivel: boolean
        }
        Insert: {
          badges?: string[] | null
          category_id: string
          created_at?: string | null
          description?: string | null
          disponivel?: boolean
          estacao_preparo?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          original_price?: number | null
          price?: number
          sort_order?: number
          tempo_preparo?: number | null
          updated_at?: string | null
          visivel?: boolean
        }
        Update: {
          badges?: string[] | null
          category_id?: string
          created_at?: string | null
          description?: string | null
          disponivel?: boolean
          estacao_preparo?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          original_price?: number | null
          price?: number
          sort_order?: number
          tempo_preparo?: number | null
          updated_at?: string | null
          visivel?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_options: {
        Row: {
          id: string
          max_select: number | null
          menu_item_id: string
          required: boolean | null
          sort_order: number | null
          title: string
        }
        Insert: {
          id?: string
          max_select?: number | null
          menu_item_id: string
          required?: boolean | null
          sort_order?: number | null
          title: string
        }
        Update: {
          id?: string
          max_select?: number | null
          menu_item_id?: string
          required?: boolean | null
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_options_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_section_products: {
        Row: {
          created_at: string
          id: string
          position: number
          product_id: string
          section_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          product_id: string
          section_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_section_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_section_products_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "menu_sections_premium"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_sections_premium: {
        Row: {
          active: boolean
          auto_scroll: boolean
          created_at: string
          id: string
          name: string
          product_image_size: string
          sort_order: number
          speed: number
          type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          auto_scroll?: boolean
          created_at?: string
          id?: string
          name?: string
          product_image_size?: string
          sort_order?: number
          speed?: number
          type?: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          auto_scroll?: boolean
          created_at?: string
          id?: string
          name?: string
          product_image_size?: string
          sort_order?: number
          speed?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      option_groups: {
        Row: {
          ativo: boolean
          created_at: string | null
          descricao: string | null
          id: string
          max_selecao: number
          min_selecao: number
          nome: string
          obrigatorio: boolean
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          descricao?: string | null
          id?: string
          max_selecao?: number
          min_selecao?: number
          nome?: string
          obrigatorio?: boolean
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          descricao?: string | null
          id?: string
          max_selecao?: number
          min_selecao?: number
          nome?: string
          obrigatorio?: boolean
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      option_items: {
        Row: {
          ativo: boolean | null
          descricao: string | null
          group_id: string | null
          id: string
          imagem_url: string | null
          menu_option_id: string | null
          name: string
          price: number | null
          sort_order: number | null
        }
        Insert: {
          ativo?: boolean | null
          descricao?: string | null
          group_id?: string | null
          id?: string
          imagem_url?: string | null
          menu_option_id?: string | null
          name: string
          price?: number | null
          sort_order?: number | null
        }
        Update: {
          ativo?: boolean | null
          descricao?: string | null
          group_id?: string | null
          id?: string
          imagem_url?: string | null
          menu_option_id?: string | null
          name?: string
          price?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "option_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "option_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "option_items_menu_option_id_fkey"
            columns: ["menu_option_id"]
            isOneToOne: false
            referencedRelation: "menu_options"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          created_at: string
          data_pagamento: string | null
          id: string
          mercado_pago_payment_id: string | null
          metodo: string
          pedido_id: string
          status: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mercado_pago_payment_id?: string | null
          metodo?: string
          pedido_id: string
          status?: string
          updated_at?: string | null
          valor?: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mercado_pago_payment_id?: string | null
          metodo?: string
          pedido_id?: string
          status?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          telefone: string
          token: string
          used: boolean
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          telefone: string
          token: string
          used?: boolean
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          telefone?: string
          token?: string
          used?: boolean
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          api_provider_utilizado: string | null
          cliente_id: string
          complemento: string | null
          created_at: string
          cupom_utilizado: string | null
          desconto: number | null
          distancia_km: number | null
          endereco_entrega: string | null
          endereco_id: string | null
          espera_iniciada_em: string | null
          forma_pagamento: string
          id: string
          idempotency_key: string | null
          itens: Json
          mercado_pago_id: string | null
          numero_pedido: string
          observacoes: string | null
          pedido_concluido_em: string | null
          preparo_finalizado_em: string | null
          preparo_iniciado_em: string | null
          status: string
          status_pagamento: string
          tempo_espera: number | null
          tempo_preparo: number | null
          tempo_total: number | null
          tipo_entrega: string
          tipo_promocao_aplicada: string | null
          updated_at: string | null
          valor_frete: number | null
          valor_total: number
        }
        Insert: {
          api_provider_utilizado?: string | null
          cliente_id: string
          complemento?: string | null
          created_at?: string
          cupom_utilizado?: string | null
          desconto?: number | null
          distancia_km?: number | null
          endereco_entrega?: string | null
          endereco_id?: string | null
          espera_iniciada_em?: string | null
          forma_pagamento: string
          id?: string
          idempotency_key?: string | null
          itens: Json
          mercado_pago_id?: string | null
          numero_pedido: string
          observacoes?: string | null
          pedido_concluido_em?: string | null
          preparo_finalizado_em?: string | null
          preparo_iniciado_em?: string | null
          status?: string
          status_pagamento?: string
          tempo_espera?: number | null
          tempo_preparo?: number | null
          tempo_total?: number | null
          tipo_entrega: string
          tipo_promocao_aplicada?: string | null
          updated_at?: string | null
          valor_frete?: number | null
          valor_total: number
        }
        Update: {
          api_provider_utilizado?: string | null
          cliente_id?: string
          complemento?: string | null
          created_at?: string
          cupom_utilizado?: string | null
          desconto?: number | null
          distancia_km?: number | null
          endereco_entrega?: string | null
          endereco_id?: string | null
          espera_iniciada_em?: string | null
          forma_pagamento?: string
          id?: string
          idempotency_key?: string | null
          itens?: Json
          mercado_pago_id?: string | null
          numero_pedido?: string
          observacoes?: string | null
          pedido_concluido_em?: string | null
          preparo_finalizado_em?: string | null
          preparo_iniciado_em?: string | null
          status?: string
          status_pagamento?: string
          tempo_espera?: number | null
          tempo_preparo?: number | null
          tempo_total?: number | null
          tipo_entrega?: string
          tipo_promocao_aplicada?: string | null
          updated_at?: string | null
          valor_frete?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_endereco_id_fkey"
            columns: ["endereco_id"]
            isOneToOne: false
            referencedRelation: "enderecos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_groups: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          ordem: number
          product_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          ordem?: number
          product_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          ordem?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "option_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recommendations: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          priority: number | null
          product_id: string
          recommended_product_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          priority?: number | null
          product_id: string
          recommended_product_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          priority?: number | null
          product_id?: string
          recommended_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recommendations_recommended_product_id_fkey"
            columns: ["recommended_product_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      promocoes_config: {
        Row: {
          banner_promo: Json
          cupom_surpresa: Json
          desconto_progressivo: Json
          frete_gratis_auto: Json
          happy_hour: Json
          id: string
          primeira_compra: Json
          promo_dia_semana: Json
          promo_relampago: Json
          recuperacao_inativos: Json
          regras_prioridade: Json
          updated_at: string | null
        }
        Insert: {
          banner_promo?: Json
          cupom_surpresa?: Json
          desconto_progressivo?: Json
          frete_gratis_auto?: Json
          happy_hour?: Json
          id?: string
          primeira_compra?: Json
          promo_dia_semana?: Json
          promo_relampago?: Json
          recuperacao_inativos?: Json
          regras_prioridade?: Json
          updated_at?: string | null
        }
        Update: {
          banner_promo?: Json
          cupom_surpresa?: Json
          desconto_progressivo?: Json
          frete_gratis_auto?: Json
          happy_hour?: Json
          id?: string
          primeira_compra?: Json
          promo_dia_semana?: Json
          promo_relampago?: Json
          recuperacao_inativos?: Json
          regras_prioridade?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          aprovado: boolean
          cliente_id: string
          comentario: string
          criado_em: string
          id: string
          nome_cliente: string
          nota: number
          pedido_id: string
          respondido_em: string | null
          resposta_loja: string | null
        }
        Insert: {
          aprovado?: boolean
          cliente_id: string
          comentario?: string
          criado_em?: string
          id?: string
          nome_cliente?: string
          nota: number
          pedido_id: string
          respondido_em?: string | null
          resposta_loja?: string | null
        }
        Update: {
          aprovado?: boolean
          cliente_id?: string
          comentario?: string
          criado_em?: string
          id?: string
          nome_cliente?: string
          nota?: number
          pedido_id?: string
          respondido_em?: string | null
          resposta_loja?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_config: {
        Row: {
          id: string
          smtp_host: string
          smtp_password: string
          smtp_port: string
          smtp_sender_email: string
          smtp_sender_name: string
          smtp_user: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: string
          smtp_sender_email?: string
          smtp_sender_name?: string
          smtp_user?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: string
          smtp_sender_email?: string
          smtp_sender_name?: string
          smtp_user?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      special_dates: {
        Row: {
          close_time: string | null
          created_at: string
          date: string
          description: string
          id: string
          is_open: boolean
          open_time: string | null
        }
        Insert: {
          close_time?: string | null
          created_at?: string
          date: string
          description?: string
          id?: string
          is_open?: boolean
          open_time?: string | null
        }
        Update: {
          close_time?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          is_open?: boolean
          open_time?: string | null
        }
        Relationships: []
      }
      store_config: {
        Row: {
          address: string | null
          delivery_estimated_time: string | null
          delivery_fee: number | null
          delivery_free_above: number | null
          design_alt_logo_url: string | null
          design_badge_bg: string | null
          design_badge_text: string | null
          design_banner_button_bg: string | null
          design_banner_button_text: string | null
          design_banner_overlay: string | null
          design_banner_title_color: string | null
          design_bg_body: string | null
          design_bg_container: string | null
          design_bg_image_url: string | null
          design_button_primary_bg: string | null
          design_button_primary_text: string | null
          design_button_radius: string | null
          design_button_secondary_bg: string | null
          design_button_secondary_text: string | null
          design_card_bg: string | null
          design_card_description_color: string | null
          design_card_description_size: string | null
          design_card_radius: string | null
          design_card_shadow: string | null
          design_card_title_color: string | null
          design_card_title_size: string | null
          design_cart_bg: string | null
          design_cart_border_color: string | null
          design_cart_title_color: string | null
          design_category_active_bg: string | null
          design_category_active_text: string | null
          design_category_bg: string | null
          design_category_border_radius: string | null
          design_category_text: string | null
          design_category_text_size: string | null
          design_color_primary: string | null
          design_color_secondary: string | null
          design_color_text_light: string | null
          design_color_text_main: string | null
          design_container_width: string | null
          design_font_family: string | null
          design_header_badge_bg: string | null
          design_header_badge_text: string | null
          design_header_bg: string | null
          design_header_text: string | null
          design_price_color: string | null
          design_price_size: string | null
          design_product_img_height: string | null
          design_product_img_hover_zoom: string | null
          design_product_img_ratio_lock: string | null
          design_product_img_shape: string | null
          design_product_img_width: string | null
          design_text_size: string | null
          design_title_size: string | null
          facebook_url: string | null
          ga4_measurement_id: string | null
          hero_image_url: string | null
          id: string
          instagram_url: string | null
          is_open: boolean | null
          logo_url: string | null
          minimum_order: number | null
          name: string
          rating: number | null
          schedule_weekdays: string | null
          schedule_weekends: string | null
          show_address: boolean | null
          show_facebook: boolean | null
          show_instagram: boolean | null
          slogan: string | null
          status_message: string | null
          updated_at: string | null
          whatsapp: string | null
          whatsapp_message: string | null
        }
        Insert: {
          address?: string | null
          delivery_estimated_time?: string | null
          delivery_fee?: number | null
          delivery_free_above?: number | null
          design_alt_logo_url?: string | null
          design_badge_bg?: string | null
          design_badge_text?: string | null
          design_banner_button_bg?: string | null
          design_banner_button_text?: string | null
          design_banner_overlay?: string | null
          design_banner_title_color?: string | null
          design_bg_body?: string | null
          design_bg_container?: string | null
          design_bg_image_url?: string | null
          design_button_primary_bg?: string | null
          design_button_primary_text?: string | null
          design_button_radius?: string | null
          design_button_secondary_bg?: string | null
          design_button_secondary_text?: string | null
          design_card_bg?: string | null
          design_card_description_color?: string | null
          design_card_description_size?: string | null
          design_card_radius?: string | null
          design_card_shadow?: string | null
          design_card_title_color?: string | null
          design_card_title_size?: string | null
          design_cart_bg?: string | null
          design_cart_border_color?: string | null
          design_cart_title_color?: string | null
          design_category_active_bg?: string | null
          design_category_active_text?: string | null
          design_category_bg?: string | null
          design_category_border_radius?: string | null
          design_category_text?: string | null
          design_category_text_size?: string | null
          design_color_primary?: string | null
          design_color_secondary?: string | null
          design_color_text_light?: string | null
          design_color_text_main?: string | null
          design_container_width?: string | null
          design_font_family?: string | null
          design_header_badge_bg?: string | null
          design_header_badge_text?: string | null
          design_header_bg?: string | null
          design_header_text?: string | null
          design_price_color?: string | null
          design_price_size?: string | null
          design_product_img_height?: string | null
          design_product_img_hover_zoom?: string | null
          design_product_img_ratio_lock?: string | null
          design_product_img_shape?: string | null
          design_product_img_width?: string | null
          design_text_size?: string | null
          design_title_size?: string | null
          facebook_url?: string | null
          ga4_measurement_id?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          is_open?: boolean | null
          logo_url?: string | null
          minimum_order?: number | null
          name?: string
          rating?: number | null
          schedule_weekdays?: string | null
          schedule_weekends?: string | null
          show_address?: boolean | null
          show_facebook?: boolean | null
          show_instagram?: boolean | null
          slogan?: string | null
          status_message?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          whatsapp_message?: string | null
        }
        Update: {
          address?: string | null
          delivery_estimated_time?: string | null
          delivery_fee?: number | null
          delivery_free_above?: number | null
          design_alt_logo_url?: string | null
          design_badge_bg?: string | null
          design_badge_text?: string | null
          design_banner_button_bg?: string | null
          design_banner_button_text?: string | null
          design_banner_overlay?: string | null
          design_banner_title_color?: string | null
          design_bg_body?: string | null
          design_bg_container?: string | null
          design_bg_image_url?: string | null
          design_button_primary_bg?: string | null
          design_button_primary_text?: string | null
          design_button_radius?: string | null
          design_button_secondary_bg?: string | null
          design_button_secondary_text?: string | null
          design_card_bg?: string | null
          design_card_description_color?: string | null
          design_card_description_size?: string | null
          design_card_radius?: string | null
          design_card_shadow?: string | null
          design_card_title_color?: string | null
          design_card_title_size?: string | null
          design_cart_bg?: string | null
          design_cart_border_color?: string | null
          design_cart_title_color?: string | null
          design_category_active_bg?: string | null
          design_category_active_text?: string | null
          design_category_bg?: string | null
          design_category_border_radius?: string | null
          design_category_text?: string | null
          design_category_text_size?: string | null
          design_color_primary?: string | null
          design_color_secondary?: string | null
          design_color_text_light?: string | null
          design_color_text_main?: string | null
          design_container_width?: string | null
          design_font_family?: string | null
          design_header_badge_bg?: string | null
          design_header_badge_text?: string | null
          design_header_bg?: string | null
          design_header_text?: string | null
          design_price_color?: string | null
          design_price_size?: string | null
          design_product_img_height?: string | null
          design_product_img_hover_zoom?: string | null
          design_product_img_ratio_lock?: string | null
          design_product_img_shape?: string | null
          design_product_img_width?: string | null
          design_text_size?: string | null
          design_title_size?: string | null
          facebook_url?: string | null
          ga4_measurement_id?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          is_open?: boolean | null
          logo_url?: string | null
          minimum_order?: number | null
          name?: string
          rating?: number | null
          schedule_weekdays?: string | null
          schedule_weekends?: string | null
          show_address?: boolean | null
          show_facebook?: boolean | null
          show_instagram?: boolean | null
          slogan?: string | null
          status_message?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          whatsapp_message?: string | null
        }
        Relationships: []
      }
      store_hours: {
        Row: {
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_open: boolean
          open_time: string
          updated_at: string | null
        }
        Insert: {
          close_time?: string
          created_at?: string
          day_of_week: number
          id?: string
          is_open?: boolean
          open_time?: string
          updated_at?: string | null
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_open?: boolean
          open_time?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      store_override: {
        Row: {
          created_at: string
          force_status: boolean
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          force_status?: boolean
          id?: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          force_status?: boolean
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      store_pause: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          is_active: boolean
          reason: string
          start_time: string | null
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_active?: boolean
          reason?: string
          start_time?: string | null
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_active?: boolean
          reason?: string
          start_time?: string | null
        }
        Relationships: []
      }
      system_audit_logs: {
        Row: {
          action: string
          created_at: string
          description: string
          id: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          action?: string
          created_at?: string
          description?: string
          id?: string
          user_email?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          id?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_self_healing_logs: {
        Row: {
          created_at: string
          description: string
          id: string
          issue_type: string
          resolution: string
          resolved: boolean
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          issue_type?: string
          resolution?: string
          resolved?: boolean
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          issue_type?: string
          resolution?: string
          resolved?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      dashboard_stats: {
        Row: {
          faturamento_7d: number | null
          faturamento_hoje: number | null
          faturamento_total: number | null
          pedidos_7d: number | null
          pedidos_cancelados: number | null
          pedidos_concluidos: number | null
          pedidos_hoje: number | null
          ticket_medio: number | null
          total_pedidos: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      batch_update_sort_order: {
        Args: { p_ids: string[]; p_orders: number[]; p_table: string }
        Returns: undefined
      }
      find_cliente_by_phone: {
        Args: { p_telefone: string }
        Returns: {
          cpf: string | null
          created_at: string
          data_nascimento: string
          email: string | null
          endereco: string
          id: string
          nome_completo: string
          telefone: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "clientes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_email_by_phone: { Args: { p_telefone: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_cupom_uso: {
        Args: { cupom_id_param: string }
        Returns: undefined
      }
      refresh_dashboard_stats: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user" | "manager" | "kds"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "manager", "kds"],
    },
  },
} as const

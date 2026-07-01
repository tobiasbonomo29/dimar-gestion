# Dimar SRL — Sistema de Gestión de Pedidos

Sistema interno para gestionar pedidos, cotizaciones y trazabilidad de estados
(geles refrigerantes, sachets y bolsas). Mono-usuario (área administrativa).

## Stack

- **Next.js 15** (App Router, TypeScript, Server Actions)
- **Supabase** (Postgres + Auth + Storage)
- **Tailwind CSS v4 + shadcn/ui**
- **React Hook Form + Zod**
- Despliegue en **Vercel**

## Puesta en marcha

```bash
npm install
cp .env.local.example .env.local   # completar con las credenciales de Supabase

# Migraciones (con Supabase CLI enlazado al proyecto)
supabase db push          # o correr los .sql de supabase/migrations en orden
npm run db:types          # regenerar src/types/database.ts desde el esquema real

npm run dev
```

## Estructura de carpetas

```
dimar-gestion/
├── src/
│   ├── app/                          # App Router
│   │   ├── (auth)/login/             # login (público)
│   │   ├── (app)/                    # rutas privadas (layout con sidebar)
│   │   │   ├── page.tsx              # dashboard
│   │   │   ├── clientes/             # CRUD clientes
│   │   │   ├── productos/            # CRUD catálogo
│   │   │   └── pedidos/              # carga, estados, PDF
│   │   ├── layout.tsx                # layout raíz
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                       # componentes shadcn/ui
│   │   └── ...                       # componentes compartidos
│   ├── features/                     # lógica por dominio
│   │   ├── clientes/
│   │   │   ├── actions.ts            # Server Actions (mutaciones)
│   │   │   ├── queries.ts            # lecturas (Server Components)
│   │   │   ├── schema.ts             # validación Zod
│   │   │   └── components/           # formularios/tablas del dominio
│   │   ├── productos/
│   │   └── pedidos/
│   ├── lib/
│   │   ├── supabase/                 # client.ts, server.ts, middleware.ts
│   │   ├── constants.ts              # estados, colores, categorías, empresa
│   │   ├── format.ts                 # moneda ARS, fechas, números
│   │   └── utils.ts                  # cn()
│   ├── types/
│   │   └── database.ts               # tipos del esquema (regenerables)
│   └── middleware.ts                 # refresco de sesión + protección de rutas
├── supabase/
│   └── migrations/                   # 0001_init, 0002_triggers, 0003_rls, 0004_seed
└── ...
```

## Modelo de datos

`clientes` · `productos` + `producto_variantes` · `pedidos` + `pedido_items` ·
`historial_estado`.

Automatizaciones en base de datos (triggers):
- `updated_at` automático en todas las tablas.
- **Total del pedido** recalculado al insertar/editar/borrar ítems.
- **Historial de estados** registrado automáticamente al crear el pedido y en
  cada cambio de estado.

## Estados del pedido

`cotizado` (gris) → `confirmado` (azul) → `en_produccion` (amarillo) →
`despachado` (violeta) → `facturado` (verde). `cancelado` (rojo) es terminal.
```

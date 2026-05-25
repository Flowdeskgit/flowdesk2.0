import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  Download,
  Play,
  Pencil,
  Trash2,
  Tag,
  File,
} from 'lucide-react';

/* ───────────────────────────────────────────── */
/* CATEGORY COLORS */
/* ───────────────────────────────────────────── */

const categoriaColors = {
  'Previdenciário':
    'bg-[#EAF4FF] text-[#185FA5] border-[#BFDDF7]',

  'Trabalhista':
    'bg-orange-50 text-orange-700 border-orange-200',

  'Bancário':
    'bg-indigo-50 text-indigo-700 border-indigo-200',

  'Cível':
    'bg-emerald-50 text-emerald-700 border-emerald-200',

  'Administrativo':
    'bg-slate-100 text-slate-700 border-slate-200',

  'Kit Judicial':
    'bg-cyan-50 text-cyan-700 border-cyan-200',

  'Ficha Questionário':
    'bg-[#EAF4FF] text-[#185FA5] border-[#BFDDF7]',

  'Outro':
    'bg-gray-100 text-gray-700 border-gray-200',
};

/* ───────────────────────────────────────────── */
/* FILE ICON */
/* ───────────────────────────────────────────── */

const tipoIcon = {
  docx: '📄',
  doc: '📄',
  pdf: '📕',
  outro: '📎',
};

/* ───────────────────────────────────────────── */
/* COMPONENT */
/* ───────────────────────────────────────────── */

export default function ModeloCard({
  modelo,
  isAdmin,
  onUsar,
  onEditar,
  onExcluir,
}) {
  return (
    <div className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-[#BFDDF7] transition-all duration-200 flex flex-col gap-4">

      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">

        <div className="flex items-center gap-3 flex-1 min-w-0">

          <div className="h-11 w-11 rounded-2xl bg-[#EAF4FF] border border-[#BFDDF7] flex items-center justify-center flex-shrink-0 text-xl">
            {tipoIcon[modelo.tipo_arquivo] || '📄'}
          </div>

          <div className="flex-1 min-w-0">

            <h3 className="font-semibold text-[#0F172A] text-sm leading-snug truncate">
              {modelo.nome}
            </h3>

            <p className="text-xs text-slate-400 mt-0.5">
              v{modelo.versao || '1.0'}
            </p>
          </div>
        </div>

        <Badge
          className={`
            ${categoriaColors[modelo.categoria] || categoriaColors['Outro']}
            border
            text-[10px]
            font-medium
            shadow-none
          `}
        >
          {modelo.categoria}
        </Badge>
      </div>

      {/* DESCRIPTION */}
      {modelo.descricao && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
          {modelo.descricao}
        </p>
      )}

      {/* TAGS */}
      {modelo.tags && modelo.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">

          {modelo.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full border border-slate-200"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}

          {modelo.tags.length > 4 && (
            <span className="text-[10px] text-slate-400 self-center">
              +{modelo.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* FILE INFO */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">

        <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0">

          <File className="h-3 w-3 flex-shrink-0" />

          <span className="truncate">
            {modelo.nome_arquivo || 'arquivo.docx'}
          </span>
        </div>

        <Badge
          variant="outline"
          className={`
            text-[10px]
            font-medium
            ${
              modelo.status === 'ativo'
                ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                : 'border-slate-200 text-slate-400 bg-slate-50'
            }
          `}
        >
          {modelo.status}
        </Badge>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-2 pt-1">

        {/* PRIMARY */}
        <Button
          size="sm"
          className="
            flex-1
            h-9
            text-xs
            font-medium
            bg-[#378ADD]
            hover:bg-[#185FA5]
            text-white
            shadow-sm
            rounded-xl
            transition-all
          "
          onClick={() => onUsar(modelo)}
          disabled={modelo.status !== 'ativo'}
        >
          <Play className="mr-1.5 h-3.5 w-3.5" />
          Usar Modelo
        </Button>

        {/* DOWNLOAD */}
        <a
          href={modelo.arquivo_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            size="icon"
            variant="outline"
            className="
              h-9
              w-9
              rounded-xl
              border-slate-200
              hover:bg-[#EAF4FF]
              hover:border-[#BFDDF7]
            "
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
          </Button>
        </a>

        {/* ADMIN ACTIONS */}
        {isAdmin && (
          <>
            <Button
              size="icon"
              variant="outline"
              className="
                h-9
                w-9
                rounded-xl
                border-slate-200
                hover:bg-[#EAF4FF]
                hover:border-[#BFDDF7]
              "
              onClick={() => onEditar(modelo)}
            >
              <Pencil className="h-3.5 w-3.5 text-slate-500" />
            </Button>

            <Button
              size="icon"
              variant="outline"
              className="
                h-9
                w-9
                rounded-xl
                border-red-100
                hover:bg-red-50
                hover:border-red-200
              "
              onClick={() => onExcluir(modelo)}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
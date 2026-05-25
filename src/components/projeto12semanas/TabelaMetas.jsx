import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';

export default function TabelaMetas({ cicloId, metas = [] }) {
  const [metasLocal, setMetasLocal] = useState(metas);
  const [editandoLinhas, setEditandoLinhas] = useState({});
  const queryClient = useQueryClient();

  const createMetaMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.MetaCiclo12Semanas.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas-ciclo', cicloId] });
      setEditandoLinhas({});
    },
  });

  const updateMetaMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.MetaCiclo12Semanas.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas-ciclo', cicloId] });
      setEditandoLinhas({});
    },
  });

  const handleMudancaValor = (index, campo, valor) => {
    const novasMetas = [...metasLocal];
    novasMetas[index] = {
      ...novasMetas[index],
      [campo]: parseInt(valor) || 0
    };
    // Recalcula total
    if (['segunda', 'terca', 'quarta', 'quinta', 'sexta'].includes(campo)) {
      novasMetas[index].total = 
        (novasMetas[index].segunda || 0) +
        (novasMetas[index].terca || 0) +
        (novasMetas[index].quarta || 0) +
        (novasMetas[index].quinta || 0) +
        (novasMetas[index].sexta || 0);
    }
    setMetasLocal(novasMetas);
  };

  const handleSalvar = (index) => {
    const meta = metasLocal[index];
    if (meta.id) {
      updateMetaMutation.mutate({
        id: meta.id,
        data: {
          segunda: meta.segunda,
          terca: meta.terca,
          quarta: meta.quarta,
          quinta: meta.quinta,
          sexta: meta.sexta,
          total: meta.total
        }
      });
    } else {
      createMetaMutation.mutate({
        ciclo_id: cicloId,
        semana: meta.semana,
        segunda: meta.segunda,
        terca: meta.terca,
        quarta: meta.quarta,
        quinta: meta.quinta,
        sexta: meta.sexta,
        total: meta.total
      });
    }
  };

  const handleAdicionarSemana = () => {
    const novasMetas = [...metasLocal];
    const ultimaSemana = Math.max(...novasMetas.map(m => m.semana || 0), 0);
    novasMetas.push({
      semana: ultimaSemana + 1,
      segunda: 0,
      terca: 0,
      quarta: 0,
      quinta: 0,
      sexta: 0,
      total: 0
    });
    setMetasLocal(novasMetas);
  };

  const diasSemana = [
    { label: 'Segunda', campo: 'segunda' },
    { label: 'Terça', campo: 'terca' },
    { label: 'Quarta', campo: 'quarta' },
    { label: 'Quinta', campo: 'quinta' },
    { label: 'Sexta', campo: 'sexta' }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Metas Diárias por Semana</CardTitle>
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={handleAdicionarSemana}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Semana
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b-2 border-indigo-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Semana</th>
                {diasSemana.map(dia => (
                  <th key={dia.campo} className="px-4 py-3 text-center font-semibold text-slate-700">
                    {dia.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-semibold text-yellow-700 bg-yellow-50">
                  Total
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {metasLocal.map((meta, index) => (
                <tr key={index} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">Semana {meta.semana}</td>
                  {diasSemana.map(dia => (
                    <td key={dia.campo} className="px-4 py-3 text-center">
                      <Input
                        type="number"
                        min="0"
                        value={meta[dia.campo] || 0}
                        onChange={(e) => handleMudancaValor(index, dia.campo, e.target.value)}
                        className="w-16 text-center h-8"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center bg-yellow-50 font-semibold text-yellow-700">
                    {meta.total || 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleSalvar(index)}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Salvar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Meta Total Semanal:</strong> 30 clientes/semana
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Distribua os valores entre os dias da semana. O total é calculado automaticamente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp } from 'lucide-react';

import AbaPosts from '@/components/marketing/AbaPosts';
import AbaLandingPages from '@/components/marketing/AbaLandingPages';
import AbaDashboardAgenda from '@/components/marketing/AbaDashboardAgenda';
import AbaLeadsFollowUp from '@/components/marketing/AbaLeadsFollowUp';
import AbaSocialSelling from '@/components/marketing/AbaSocialSelling';
import AbaInstagramCanais from '@/components/marketing/AbaInstagramCanais';
import AbaClubeDoLivro from '@/components/marketing/AbaClubeDoLivro';
import AbaMentoria from '@/components/marketing/AbaMentoria';

export default function Marketing() {
  const { data: posts = [] } = useQuery({
    queryKey: ['posts-marketing'],
    queryFn: () => flowdesk.entities.PostMarketing.list('-created_date'),
  });

  const { data: lps = [] } = useQuery({
    queryKey: ['landing-pages'],
    queryFn: () => flowdesk.entities.LandingPage.list('-created_date'),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads-marketing'],
    queryFn: () => flowdesk.entities.LeadMarketing.list('-created_date', 500),
  });

  const statsData = {
    postsPublicados: posts.filter((p) => p.status === 'Publicado').length,
    totalLeads:
      lps.reduce((s, l) => s + (l.leads_gerados || 0), 0) +
      leads.filter((l) => l.status === 'Fechado').length,
    lpsAtivas: lps.filter((l) => l.status === 'Ativa').length,
  };

  const tabClass =
    'text-sm rounded-xl px-3 transition-all data-[state=active]:bg-[#378ADD] data-[state=active]:text-white data-[state=active]:shadow-sm';

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[#378ADD] p-3 shadow-sm shadow-[#378ADD]/20">
            <TrendingUp className="h-7 w-7 text-white" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-[#0A0F1A]">
              Marketing
            </h1>

            <p className="text-sm text-slate-500">
              Hub de Conteúdo, Vendas e Relacionamento
            </p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">

          <TabsList className="flex flex-wrap h-auto gap-1 bg-white border border-slate-200 p-1 rounded-2xl shadow-sm">
            <TabsTrigger value="dashboard" className={tabClass}>
              📊 Dashboard
            </TabsTrigger>

            <TabsTrigger value="posts" className={tabClass}>
              📸 Posts
            </TabsTrigger>

            <TabsTrigger value="landing-pages" className={tabClass}>
              🌐 LPs
            </TabsTrigger>

            <TabsTrigger value="leads" className={tabClass}>
              🎯 Leads
            </TabsTrigger>

            <TabsTrigger value="social" className={tabClass}>
              🤝 Social Selling
            </TabsTrigger>

            <TabsTrigger value="instagram" className={tabClass}>
              📱 Instagram
            </TabsTrigger>

            <TabsTrigger value="clube" className={tabClass}>
              📚 Clube do Livro
            </TabsTrigger>

            <TabsTrigger value="mentoria" className={tabClass}>
              🎓 Mentoria
            </TabsTrigger>
          </TabsList>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm">
            <TabsContent value="dashboard">
              <AbaDashboardAgenda statsData={statsData} />
            </TabsContent>

            <TabsContent value="posts">
              <AbaPosts />
            </TabsContent>

            <TabsContent value="landing-pages">
              <AbaLandingPages />
            </TabsContent>

            <TabsContent value="leads">
              <AbaLeadsFollowUp />
            </TabsContent>

            <TabsContent value="social">
              <AbaSocialSelling />
            </TabsContent>

            <TabsContent value="instagram">
              <AbaInstagramCanais />
            </TabsContent>

            <TabsContent value="clube">
              <AbaClubeDoLivro />
            </TabsContent>

            <TabsContent value="mentoria">
              <AbaMentoria />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
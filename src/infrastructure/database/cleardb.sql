-- =================================================================
-- Script Seguro para Limpar Todos os Dados
-- Remove registros respeitando a ordem de dependências
-- =================================================================

-- Limpar na ordem inversa das dependências
DELETE FROM public.commits;
DELETE FROM public.comments;
DELETE FROM public.pull_request_labels;
DELETE FROM public.issue_labels;
DELETE FROM public.labels;
DELETE FROM public.pull_requests;
DELETE FROM public.issues;
DELETE FROM public.extractions;
DELETE FROM public.repositories;

-- Confirmar limpeza
DO $$
DECLARE
    table_name TEXT;
    row_count INTEGER;
BEGIN
    RAISE NOTICE '=== Verificação de Limpeza ===';
    
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I', table_name) INTO row_count;
        RAISE NOTICE 'Tabela %: % registros', table_name, row_count;
    END LOOP;
    
    RAISE NOTICE '✅ Limpeza concluída!';
END $$;
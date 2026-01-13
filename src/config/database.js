import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configurações dos bancos de dados por empresa
const DATABASES = {
  franca: {
    name: 'Franca',
    url: 'https://mhtxyxizfnxupwmilith.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odHh5eGl6Zm54dXB3bWlsaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMzIzMDYsImV4cCI6MjA3MTcwODMwNn0.s1Y9kk2Va5EMcwAEGQmhTxo70Zv0o9oR6vrJixwEkWI'
  },
  litoral: {
    name: 'Litoral',
    url: 'https://dtifsfzmnjnllzzlndxv.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0aWZzZnptbmpubGx6emxuZHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjQ5NzUsImV4cCI6MjA3Mjc0MDk3NX0.V40szmRzuvni2J4GK5-qZUR7nBWeUy7ikYy9B7iHxkA'
  },
  mogiana: {
    name: 'Mogiana',
    url: 'https://eemfnpefgojllvzzaimu.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbWZucGVmZ29qbGx2enphaW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjUyNjIsImV4cCI6MjA3Mjc0MTI2Mn0.PKJJ-scljbF3CFrFtMz6Rq03lVt36NQxooEH3kOcr5Y'
  },
  imperatriz: {
    name: 'Imperatriz',
    url: 'https://eppzphzwwpvpoocospxy.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcHpwaHp3d3B2cG9vY29zcHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NTc1MDEsImV4cCI6MjA3NTAzMzUwMX0.QwiFlP-h3sk0-pDBmrOMkQmhWZtewD2wDMPYbXAATXI'
  }
};

// Cache de clientes Supabase
const clientsCache = new Map();

/**
 * Obtém o cliente Supabase para uma empresa específica
 * @param {string} company - Nome da empresa (franca, litoral, mogiana, imperatriz)
 * @returns {Object} Cliente Supabase
 */
export function getSupabaseClient(company = 'franca') {
  // Normalizar nome da empresa
  const normalizedCompany = company.toLowerCase();
  
  // Verificar se existe no cache
  if (clientsCache.has(normalizedCompany)) {
    return clientsCache.get(normalizedCompany);
  }
  
  // Verificar se a empresa existe
  if (!DATABASES[normalizedCompany]) {
    console.warn(`Empresa "${company}" não encontrada, usando Franca como padrão`);
    return getSupabaseClient('franca');
  }
  
  // Criar novo cliente
  const dbConfig = DATABASES[normalizedCompany];
  const client = createClient(dbConfig.url, dbConfig.key);
  
  // Armazenar no cache
  clientsCache.set(normalizedCompany, client);
  
  return client;
}

/**
 * Obtém lista de empresas disponíveis
 * @returns {Array} Lista de empresas
 */
export function getAvailableCompanies() {
  return Object.keys(DATABASES).map(key => ({
    id: key,
    name: DATABASES[key].name
  }));
}

// Cliente padrão (Franca) para compatibilidade com código existente
export const supabase = getSupabaseClient('franca');


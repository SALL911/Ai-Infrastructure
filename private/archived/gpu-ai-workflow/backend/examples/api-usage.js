/**
 * BrandOS Protocol API Usage Examples
 * Demonstrates how to use the Node.js backend API
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const API_KEY = process.env.API_KEY || 'demo-api-key-12345';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'X-Request-ID': generateRequestId()
  },
  timeout: 30000
});

// Request/response interceptors for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error.message);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ Response Error: ${error.response?.status} ${error.config?.url}`);
    console.error('Error Details:', error.response?.data);
    return Promise.reject(error);
  }
);

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load sample data
 */
function loadSampleData() {
  const dataPath = path.join(__dirname, 'sample-data.json');
  if (fs.existsSync(dataPath)) {
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
  
  // Return sample data if file doesn't exist
  return {
    brand: {
      brand_id: "techcorp-001",
      did: "did:brand:tw:techcorp-001",
      credentials: [
        {
          type: "brand_registration",
          issuer: "did:brand:tw:registry-001",
          issuanceDate: "2020-01-15T00:00:00Z"
        },
        {
          type: "legal_entity",
          issuer: "did:brand:tw:legal-registry",
          issuanceDate: "2020-01-20T00:00:00Z"
        }
      ],
      metadata: {
        name: "TechCorp",
        industry: "technology",
        country: "TW",
        registration_date: "2020-01-15T00:00:00Z",
        status: "active"
      }
    },
    esg: {
      carbon_tracking: {
        scope1_emissions: 1000.5,
        scope2_emissions: 2000.0,
        scope3_emissions: 5000.0,
        reduction_targets: [
          {
            target_year: 2030,
            reduction_percentage: 50.0,
            baseline_year: 2020,
            scope: "all"
          }
        ]
      },
      sustainability_metrics: {
        energy_consumption: 100000,
        water_usage: 5000,
        waste_generated: 1000,
        recycling_rate: 75.5,
        renewable_energy_percentage: 60.0
      },
      social_impact: {
        employee_count: 500,
        gender_diversity: 42.0,
        community_investment: 100000,
        training_hours: 40
      },
      governance: {
        board_independence: 85.0,
        ethics_training_completion: 95.0,
        compliance_incidents: 0,
        audit_frequency: 4
      }
    },
    carbon: {
      scope1_emissions: 1000.5,
      scope2_emissions: 2000.0,
      scope3_emissions: 5000.0,
      advertising_carbon: {
        platform: "meta",
        campaign_name: "Spring Sale 2026",
        impressions: 1000000,
        device_type: "all",
        region: "TW",
        measurement_date: new Date().toISOString(),
        energy_factor: 0.000001,
        emission_factor: 0.5,
        carbon_kg: 0.5
      },
      reduction_targets: [
        {
          target_year: 2030,
          reduction_percentage: 50.0,
          baseline_year: 2020,
          scope: "all"
        }
      ],
      sustainability_metrics: {
        renewable_energy_percentage: 60.0
      }
    },
    tnfd: {
      biodiversity_assessment: {
        impact_level: "neutral",
        assessment_date: "2026-01-15T00:00:00Z",
        protected_species_count: 0,
        habitat_preservation: 75.0
      },
      deforestation_risk: {
        risk_level: "low",
        assessment_date: "2026-01-15T00:00:00Z",
        forest_area_monitored: 1000,
        deforestation_rate: 0.1
      },
      ecosystem_services: {
        protection_level: 70.0,
        services_preserved: ["water_purification", "carbon_sequestration", "soil_conservation"],
        investment_amount: 50000
      },
      nature_related_risks: {
        mitigation_level: 80.0,
        risk_assessment_date: "2026-01-15T00:00:00Z",
        identified_risks: ["climate_change", "biodiversity_loss"],
        mitigation_strategies: ["renewable_energy", "habitat_restoration"]
      }
    }
  };
}

/**
 * Example 1: Calculate single brand score
 */
async function calculateSingleBrandScore() {
  console.log('\n🎯 Example 1: Calculate Single Brand Score');
  console.log('=' .repeat(50));
  
  try {
    const data = loadSampleData();
    
    const response = await api.post('/scoring/calculate', {
      brand: data.brand,
      esg: data.esg,
      carbon: data.carbon,
      tnfd: data.tnfd,
      industry: data.brand.metadata.industry,
      scoring_options: {
        benchmark_comparison: true,
        generate_recommendations: true
      }
    });

    const result = response.data.data;
    
    console.log('\n📊 Scoring Results:');
    console.log(`Brand ID: ${result.brand_id}`);
    console.log(`Total Score: ${result.total_score}`);
    console.log(`Category: ${result.category.label} (${result.category.value})`);
    console.log(`Execution Time: ${result.execution_time_ms}ms`);
    
    console.log('\n📈 Component Scores:');
    Object.entries(result.component_scores).forEach(([component, scores]) => {
      console.log(`  ${component}: ${scores.score} (weight: ${scores.weight})`);
    });
    
    console.log('\n💡 Recommendations:');
    result.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
    
    console.log('\n🏆 Benchmark Comparison:');
    Object.entries(result.benchmark_comparison).forEach(([metric, diff]) => {
      const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '=';
      console.log(`  ${metric}: ${diff > 0 ? '+' : ''}${diff} ${arrow}`);
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Single brand scoring failed:', error.response?.data || error.message);
  }
}

/**
 * Example 2: Batch calculate scores
 */
async function batchCalculateScores() {
  console.log('\n📦 Example 2: Batch Calculate Scores');
  console.log('=' .repeat(50));
  
  try {
    const baseData = loadSampleData();
    
    // Create variations for different brands
    const requests = [
      {
        brand: { ...baseData.brand, brand_id: 'techcorp-001', metadata: { ...baseData.brand.metadata, name: 'TechCorp' } },
        esg: baseData.esg,
        carbon: baseData.carbon,
        tnfd: baseData.tnfd
      },
      {
        brand: { ...baseData.brand, brand_id: 'greenretail-002', metadata: { ...baseData.brand.metadata, name: 'GreenRetail', industry: 'retail' } },
        esg: { ...baseData.esg, social_impact: { ...baseData.esg.social_impact, gender_diversity: 65.0 } },
        carbon: { ...baseData.carbon, scope3_emissions: 8000.0 },
        tnfd: baseData.tnfd
      },
      {
        brand: { ...baseData.brand, brand_id: 'financehub-003', metadata: { ...baseData.brand.metadata, name: 'FinanceHub', industry: 'finance' } },
        esg: { ...baseData.esg, governance: { ...baseData.esg.governance, board_independence: 90.0 } },
        carbon: { ...baseData.carbon, scope1_emissions: 500.0 },
        tnfd: baseData.tnfd
      }
    ];
    
    const response = await api.post('/scoring/calculate-batch', {
      requests,
      parallel_processing: true
    });

    const result = response.data.data;
    
    console.log(`\n📊 Batch Results:`);
    console.log(`Total Requests: ${result.total_requests}`);
    console.log(`Successful: ${result.successful_count}`);
    console.log(`Failed: ${result.failed_count}`);
    console.log(`Execution Time: ${result.execution_time_ms}ms`);
    console.log(`Parallel Processing: ${result.parallel_processing}`);
    
    console.log('\n🏆 Brand Rankings:');
    const successfulResults = result.results.filter(r => r.success);
    successfulResults.sort((a, b) => b.total_score - a.total_score);
    
    successfulResults.forEach((brand, index) => {
      console.log(`  ${index + 1}. ${brand.brand_id}: ${brand.total_score} (${brand.category.label})`);
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Batch scoring failed:', error.response?.data || error.message);
  }
}

/**
 * Example 3: Get industry benchmarks
 */
async function getIndustryBenchmarks() {
  console.log('\n📊 Example 3: Get Industry Benchmarks');
  console.log('=' .repeat(50));
  
  try {
    const industries = ['technology', 'retail', 'finance', 'manufacturing'];
    
    for (const industry of industries) {
      const response = await api.get(`/scoring/benchmark/${industry}`);
      const benchmark = response.data.data;
      
      console.log(`\n🏭 ${industry.charAt(0).toUpperCase() + industry.slice(1)} Industry:`);
      console.log(`  Brand Identity: ${benchmark.benchmark_scores.brand_identity}`);
      console.log(`  ESG Performance: ${benchmark.benchmark_scores.esg}`);
      console.log(`  Carbon Footprint: ${benchmark.benchmark_scores.carbon}`);
      console.log(`  TNFD Assessment: ${benchmark.benchmark_scores.tnfd}`);
      console.log(`  Overall Average: ${benchmark.overall_average}`);
    }
    
  } catch (error) {
    console.error('❌ Get benchmarks failed:', error.response?.data || error.message);
  }
}

/**
 * Example 4: Compare brands
 */
async function compareBrands() {
  console.log('\n🔍 Example 4: Compare Brands');
  console.log('=' .repeat(50));
  
  try {
    const brandIds = ['techcorp-001', 'greenretail-002', 'financehub-003'];
    
    const response = await api.post('/scoring/compare', {
      brand_ids: brandIds
    });

    const comparison = response.data.data;
    
    console.log('\n🏆 Brand Comparison Results:');
    console.log(`Comparison Date: ${comparison.comparison_date}`);
    
    console.log('\n📊 Rankings:');
    comparison.brands.forEach((brand) => {
      console.log(`  ${brand.rank}. ${brand.brand_id}: ${brand.total_score} (${brand.category})`);
    });
    
    console.log('\n📈 Statistics:');
    console.log(`  Highest Score: ${comparison.statistics.highest_score}`);
    console.log(`  Lowest Score: ${comparison.statistics.lowest_score}`);
    console.log(`  Average Score: ${comparison.statistics.average_score}`);
    console.log(`  Score Range: ${comparison.statistics.score_range}`);
    
  } catch (error) {
    console.error('❌ Brand comparison failed:', error.response?.data || error.message);
  }
}

/**
 * Example 5: Get scoring categories and weights
 */
async function getScoringInfo() {
  console.log('\n📋 Example 5: Get Scoring Information');
  console.log('=' .repeat(50));
  
  try {
    // Get categories
    const categoriesResponse = await api.get('/scoring/categories');
    const categories = categoriesResponse.data.data.categories;
    
    console.log('\n🏆 Scoring Categories:');
    Object.entries(categories).forEach(([key, category]) => {
      console.log(`  ${category.label} (${key}): ${category.score_range[0]}-${category.score_range[1]}`);
      console.log(`    ${category.description}`);
    });
    
    // Get weights
    const weightsResponse = await api.get('/scoring/weights');
    const weights = weightsResponse.data.data.weights;
    
    console.log('\n⚖️ Scoring Weights:');
    Object.entries(weights).forEach(([component, weight]) => {
      console.log(`  ${weight.description}: ${(weight.weight * 100).toFixed(1)}%`);
    });
    
    console.log(`\nTotal Weight: ${weightsResponse.data.data.total_weight}`);
    
  } catch (error) {
    console.error('❌ Get scoring info failed:', error.response?.data || error.message);
  }
}

/**
 * Example 6: Health check
 */
async function healthCheck() {
  console.log('\n🏥 Example 6: Health Check');
  console.log('=' .repeat(50));
  
  try {
    const response = await api.get('/scoring/health');
    const health = response.data.data;
    
    console.log('\n🏥 Service Health:');
    console.log(`  Status: ${health.status}`);
    console.log(`  Service: ${health.service}`);
    console.log(`  Version: ${health.version}`);
    console.log(`  Uptime: ${health.uptime}s`);
    console.log(`  Weights Loaded: ${health.weights_loaded}`);
    console.log(`  Benchmarks Loaded: ${health.benchmarks_loaded}`);
    console.log(`  Supported Industries: ${health.supported_industries.join(', ')}`);
    
    console.log('\n💾 Memory Usage:');
    console.log(`  RSS: ${Math.round(health.memory.rss / 1024 / 1024)}MB`);
    console.log(`  Heap Used: ${Math.round(health.memory.heapUsed / 1024 / 1024)}MB`);
    console.log(`  Heap Total: ${Math.round(health.memory.heapTotal / 1024 / 1024)}MB`);
    
  } catch (error) {
    console.error('❌ Health check failed:', error.response?.data || error.message);
  }
}

/**
 * Main function to run all examples
 */
async function runAllExamples() {
  console.log('🚀 BrandOS Protocol API Usage Examples');
  console.log('=' .repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  
  try {
    await healthCheck();
    await getScoringInfo();
    await getIndustryBenchmarks();
    await calculateSingleBrandScore();
    await batchCalculateScores();
    await compareBrands();
    
    console.log('\n✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Example execution failed:', error.message);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

module.exports = {
  calculateSingleBrandScore,
  batchCalculateScores,
  getIndustryBenchmarks,
  compareBrands,
  getScoringInfo,
  healthCheck,
  runAllExamples
};

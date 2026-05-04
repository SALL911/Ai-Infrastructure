/**
 * BrandOS AI Infrastructure - API Request & Response Examples
 * Comprehensive examples demonstrating the Brand Score API usage
 */

const axios = require('axios');

// API configuration
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Example 1: Calculate Brand Score - Complete Request
 * Demonstrates full API usage with all required data fields
 */
async function exampleCalculateBrandScore() {
  console.log('\n=== Example 1: Calculate Brand Score ===');
  
  const requestPayload = {
    brand_id: "techcorp-001",
    brand: {
      mentions: 15000,
      sentiment: 0.75,    // Positive sentiment (0.75 on -1 to 1 scale)
      nps: 45            // Good Net Promoter Score (45 on -100 to 100 scale)
    },
    esg: {
      e: 85,            // Excellent environmental performance
      s: 78,            // Good social performance
      g: 92             // Excellent governance
    },
    carbon: {
      total_emission: 2500.5  // kg CO2e
    },
    tnfd: {
      dependency: 0.3,  // Low dependency on nature
      impact: 0.2,      // Low negative impact
      risk: 0.15        // Low nature-related risk
    },
    metadata: {
      industry: "technology",
      region: "north-america",
      reporting_period: "Q1-2026"
    }
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/brand-score/calculate`, requestPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': 'req-' + Date.now()
      }
    });

    console.log('Request Payload:');
    console.log(JSON.stringify(requestPayload, null, 2));
    
    console.log('\nResponse:');
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Example 2: Calculate Brand Score - Minimal Request
 * Demonstrates minimal required fields
 */
async function exampleMinimalRequest() {
  console.log('\n=== Example 2: Minimal Request ===');
  
  const minimalPayload = {
    brand: {
      mentions: 5000,
      sentiment: 0.2,
      nps: 10
    },
    esg: {
      e: 65,
      s: 70,
      g: 68
    },
    carbon: {
      total_emission: 8000.0
    },
    tnfd: {
      dependency: 0.6,
      impact: 0.4,
      risk: 0.5
    }
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/brand-score/calculate`, minimalPayload);
    
    console.log('Minimal Request Payload:');
    console.log(JSON.stringify(minimalPayload, null, 2));
    
    console.log('\nResponse:');
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Example 3: Validation Error Response
 * Demonstrates what happens with invalid input data
 */
async function exampleValidationError() {
  console.log('\n=== Example 3: Validation Error ===');
  
  const invalidPayload = {
    brand: {
      mentions: "invalid",  // Should be numeric
      sentiment: 1.5,      // Should be between -1 and 1
      nps: 150            // Should be between -100 and 100
    },
    esg: {
      e: 105,            // Should be between 0 and 100
      s: -10,            // Should be between 0 and 100
      g: "bad"           // Should be numeric
    },
    carbon: {
      total_emission: -100  // Should be non-negative
    },
    tnfd: {
      dependency: 1.5,   // Should be between 0 and 1
      impact: -0.5,      // Should be between 0 and 1
      risk: 2            // Should be between 0 and 1
    }
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/brand-score/calculate`, invalidPayload);
    
    console.log('Unexpected success:', response.data);

  } catch (error) {
    console.log('Invalid Request Payload:');
    console.log(JSON.stringify(invalidPayload, null, 2));
    
    console.log('\nError Response:');
    console.log(JSON.stringify(error.response.data, null, 2));
  }
}

/**
 * Example 4: Retrieve Stored Result
 * Demonstrates retrieving a previously calculated score
 */
async function exampleRetrieveResult() {
  console.log('\n=== Example 4: Retrieve Stored Result ===');
  
  // First, calculate a score to get an ID
  const calculatePayload = {
    brand_id: "retrieve-test-001",
    brand: {
      mentions: 8000,
      sentiment: 0.6,
      nps: 35
    },
    esg: {
      e: 75,
      s: 80,
      g: 85
    },
    carbon: {
      total_emission: 4500.0
    },
    tnfd: {
      dependency: 0.25,
      impact: 0.3,
      risk: 0.2
    }
  };

  try {
    // Calculate score
    const calculateResponse = await axios.post(`${API_BASE_URL}/brand-score/calculate`, calculatePayload);
    const resultId = calculateResponse.data.data.id;
    
    console.log('Score calculated with ID:', resultId);
    
    // Retrieve the result
    const retrieveResponse = await axios.get(`${API_BASE_URL}/brand-score/${resultId}`);
    
    console.log('\nRetrieved Result:');
    console.log(JSON.stringify(retrieveResponse.data, null, 2));

    return retrieveResponse.data;

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Example 5: Verify Result Integrity
 * Demonstrates hash verification of stored results
 */
async function exampleVerifyResult() {
  console.log('\n=== Example 5: Verify Result Integrity ===');
  
  const testPayload = {
    brand_id: "verify-test-001",
    brand: {
      mentions: 12000,
      sentiment: 0.8,
      nps: 55
    },
    esg: {
      e: 88,
      s: 82,
      g: 90
    },
    carbon: {
      total_emission: 1800.0
    },
    tnfd: {
      dependency: 0.15,
      impact: 0.1,
      risk: 0.05
    }
  };

  try {
    // Calculate score
    const calculateResponse = await axios.post(`${API_BASE_URL}/brand-score/calculate`, testPayload);
    const resultId = calculateResponse.data.data.id;
    const originalHash = calculateResponse.data.data.hash;
    
    console.log('Original Hash:', originalHash);
    
    // Verify the result
    const verifyResponse = await axios.get(`${API_BASE_URL}/brand-score/${resultId}/verify`);
    
    console.log('\nVerification Result:');
    console.log(JSON.stringify(verifyResponse.data, null, 2));

    return verifyResponse.data;

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Example 6: List Results with Pagination
 * Demonstrates listing stored results with filtering
 */
async function exampleListResults() {
  console.log('\n=== Example 6: List Results ===');
  
  try {
    // List first 10 results
    const listResponse = await axios.get(`${API_BASE_URL}/brand-score?limit=10&offset=0`);
    
    console.log('List Results Response:');
    console.log(JSON.stringify(listResponse.data, null, 2));

    // List results filtered by grade
    const filteredResponse = await axios.get(`${API_BASE_URL}/brand-score?grade=A&limit=5`);
    
    console.log('\nFiltered Results (Grade A):');
    console.log(JSON.stringify(filteredResponse.data, null, 2));

    return { listResponse, filteredResponse };

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Example 7: Get Statistics
 * Demonstrates retrieving system statistics
 */
async function exampleGetStatistics() {
  console.log('\n=== Example 7: Get Statistics ===');
  
  try {
    const statsResponse = await axios.get(`${API_BASE_URL}/brand-score/stats`);
    
    console.log('Statistics Response:');
    console.log(JSON.stringify(statsResponse.data, null, 2));

    return statsResponse.data;

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Example 8: Get Configuration
 * Demonstrates retrieving current scoring configuration
 */
async function exampleGetConfiguration() {
  console.log('\n=== Example 8: Get Configuration ===');
  
  try {
    const configResponse = await axios.get(`${API_BASE_URL}/brand-score/config`);
    
    console.log('Configuration Response:');
    console.log(JSON.stringify(configResponse.data, null, 2));

    return configResponse.data;

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Example 9: Delete Result
 * Demonstrates deleting a stored result
 */
async function exampleDeleteResult() {
  console.log('\n=== Example 9: Delete Result ===');
  
  const testPayload = {
    brand_id: "delete-test-001",
    brand: {
      mentions: 3000,
      sentiment: 0.4,
      nps: 20
    },
    esg: {
      e: 70,
      s: 72,
      g: 75
    },
    carbon: {
      total_emission: 6000.0
    },
    tnfd: {
      dependency: 0.5,
      impact: 0.4,
      risk: 0.3
    }
  };

  try {
    // Calculate score to get an ID
    const calculateResponse = await axios.post(`${API_BASE_URL}/brand-score/calculate`, testPayload);
    const resultId = calculateResponse.data.data.id;
    
    console.log('Created result with ID:', resultId);
    
    // Delete the result
    const deleteResponse = await axios.delete(`${API_BASE_URL}/brand-score/${resultId}`);
    
    console.log('\nDelete Response:');
    console.log(JSON.stringify(deleteResponse.data, null, 2));

    // Try to retrieve deleted result (should fail)
    try {
      await axios.get(`${API_BASE_URL}/brand-score/${resultId}`);
    } catch (retrieveError) {
      console.log('\nExpected error when retrieving deleted result:');
      console.log(JSON.stringify(retrieveError.response.data, null, 2));
    }

    return deleteResponse.data;

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Example 10: Batch Processing
 * Demonstrates processing multiple requests
 */
async function exampleBatchProcessing() {
  console.log('\n=== Example 10: Batch Processing ===');
  
  const batchRequests = [
    {
      brand_id: "batch-001",
      brand: { mentions: 5000, sentiment: 0.3, nps: 15 },
      esg: { e: 60, s: 65, g: 70 },
      carbon: { total_emission: 7500.0 },
      tnfd: { dependency: 0.4, impact: 0.3, risk: 0.35 }
    },
    {
      brand_id: "batch-002",
      brand: { mentions: 8000, sentiment: 0.6, nps: 40 },
      esg: { e: 75, s: 78, g: 82 },
      carbon: { total_emission: 3200.0 },
      tnfd: { dependency: 0.2, impact: 0.25, risk: 0.15 }
    },
    {
      brand_id: "batch-003",
      brand: { mentions: 12000, sentiment: 0.85, nps: 65 },
      esg: { e: 90, s: 85, g: 88 },
      carbon: { total_emission: 1500.0 },
      tnfd: { dependency: 0.1, impact: 0.15, risk: 0.08 }
    }
  ];

  try {
    console.log('Processing', batchRequests.length, 'requests...');
    
    const results = [];
    
    for (const request of batchRequests) {
      const response = await axios.post(`${API_BASE_URL}/brand-score/calculate`, request);
      results.push({
        brand_id: request.brand_id,
        score: response.data.data.brand_score,
        grade: response.data.data.grade,
        confidence: response.data.data.confidence,
        id: response.data.data.id
      });
    }

    console.log('\nBatch Processing Results:');
    console.log(JSON.stringify(results, null, 2));

    return results;

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Main function to run all examples
 */
async function runAllExamples() {
  console.log('BrandOS AI Infrastructure - API Examples');
  console.log('==========================================');
  
  try {
    await exampleCalculateBrandScore();
    await exampleMinimalRequest();
    await exampleValidationError();
    await exampleRetrieveResult();
    await exampleVerifyResult();
    await exampleListResults();
    await exampleGetStatistics();
    await exampleGetConfiguration();
    await exampleDeleteResult();
    await exampleBatchProcessing();
    
    console.log('\n=== All Examples Completed ===');
    
  } catch (error) {
    console.error('Error running examples:', error.message);
  }
}

// Export individual examples for selective testing
module.exports = {
  exampleCalculateBrandScore,
  exampleMinimalRequest,
  exampleValidationError,
  exampleRetrieveResult,
  exampleVerifyResult,
  exampleListResults,
  exampleGetStatistics,
  exampleGetConfiguration,
  exampleDeleteResult,
  exampleBatchProcessing,
  runAllExamples
};

// Run all examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

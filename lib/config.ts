const CONFIG_PATH = 'config/valuation-parameters.json';

const defaultConfig = {
  pricePerSqm: 2500,
  depreciation: 0.3,
  secondBathroom: 3,
  cellar: 3,
  renovated: 10,
  groundFloor: -5,
  topFloor: -3,
  exposureSouth: 5,
  exposureEast: 3,
  exposureWest: 2,
  exposureNorth: -3,
  heatingAutonomous: 5,
  heatingCentralized: -2,
};

export async function getValuationConfig() {
  try {
    const blobUrl = `${process.env.BLOB_READ_WRITE_TOKEN}/${CONFIG_PATH}`;
    const response = await fetch(blobUrl, { cache: 'no-store' });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Using default config:', error);
  }
  
  return defaultConfig;
}
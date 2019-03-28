let fetch = {}

if (typeof window === 'undefined') {
    fetch = require('node-fetch')
} else {
    fetch = window.fetch
}

module.exports = function usePowSrvIO (timeoutMs, apiKey) {

  return async function attachToTangle (trunkTransaction, branchTransaction, minWeightMagnitude, trytes, cb) {
  
    let resp;
    
    resp = await powsrvATT(
      trunkTransaction,
      branchTransaction,
      minWeightMagnitude,
      trytes,
      timeoutMs,
      apiKey
    );
  
    if ((resp[0]) != null) {
      return resp[0];
    } else {
      return resp[1].trytes;
    }

  };
};


async function powsrvATT (trunkTransaction, branchTransaction, minWeightMagnitude, trytes, timeoutMs, apiKey) {
  var command = {
    'command'             : 'attachToTangle',
    'trunkTransaction'    : trunkTransaction,
    'branchTransaction'   : branchTransaction,
    'minWeightMagnitude'  : minWeightMagnitude,
    'trytes'              : trytes
  };

  let params = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-IOTA-API-Version': '1'
    },
    body: JSON.stringify(command),
    timeout: timeoutMs
  };
  if (apiKey) params.headers['Authorization'] = 'powsrv-token ' + apiKey;

  try {
    const response = await fetch('https://api.powsrv.io:443', params);

    if (response.status != 200) {
      if ((response.status > 300) && (response.status < 600)) {
        // 3xx-5xx responses are NOT network errors
        const msg = await response.json();
        return [msg.message, null];
      }
      return [response.statusText, null];
    } 
    const data = await response.json();
    return [null, data];
  }
  catch (e) {
    return [e, null];
  }
};

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([], () => {
  const onRequest = (scriptContext) => {
    if (scriptContext.request.method === 'GET') {
      // Handle GET request here
      scriptContext.response.write('Suitelet GET request working...');
    } else {
      // Handle POST request here
      scriptContext.response.write('Suitelet POST request working...');
    }
  };

  return {
    onRequest,
  };
});

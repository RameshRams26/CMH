/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/https",
  "N/search",
  "N/url",
  "../NSWMS V3 Globals/utility_module",
  "N/render",
  "N/file",
  "N/encode",
], /**
 * @param{https} https
 * @param{search} search
 * @param{url} url
 */ (https, search, url, utility, render, file, encode) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    try {
      var from = scriptContext.request.parameters.from;
      var data = JSON.parse(scriptContext.request.parameters.data);
      log.debug("params::", JSON.stringify(data));
      var printObj = data.printObj;

      var htmlHead = `<!DOCTYPE html>
          <html>
            <head>
              <title>BarCode</title>
              <script src='https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.0/JsBarcode.all.min.js'></script>
              <link href='https://fonts.googleapis.com/css?family=Libre Barcode 39' rel='stylesheet'>
              <script src='https: //cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js' integrity='sha512-QEAheCz+x/VkKtxeGoDq6nsGyzTx/0LMINTgQjqZ0h3+NjP+bCsPYz3hn0HnBkGmkIFSr7QcEZT+KyEM7lbLPQ==' crossorigin='anonymous' referrerpolicy='no-referrer'></script>
              <style>
                body {
                  font-family: sans-serif;
                }
             
                .barcode {
                  align-items: center;
                  justify-content: center;
                  text-align: center;
                }
              
                .details {
                  margin: 4px 0 0 9px;
                }
                .name {
                  font-size: 22px;
                  font-weight: bold;
                  margin-bottom: 10px;
                  margin: 5px 0 5px 7px;
                }
                .order-number {
                  font-size: 20px;
                  margin: 3px 25px 10px 0px;
                }
                .lot-number {
                  float: right;
                }
                .description {
                  font-size: 20px;
                }
              </style>
            </head>  
            <body> `;
      var MainJSONData = [];
      for (var i = 0; i < printObj.length; i++) {
        var binNumber = printObj[i].binNoText; // Retrieve bin number from data
        var invoNumber = printObj[i].invNoText; // Retrieve invoice number from data

        var html = htmlHead;
        html += '<div class="label">';
        html += '<div class="name">Acer Laptop</div>';
        html += '<div class="barcode">';

        html += '<img id="barcode1" height="100px" width="100%" />';
        html +=
          '<script>JsBarcode("#barcode1", "' +
          invoNumber +
          '", {format: "CODE128",displayValue: false});</script>';

        html += "</div>";
        html += '<div class="details">';
        html += '<div class="order-number">';
        html += '<span class="Bin-number">' + binNumber + "</span>";
        html += '<span class="lot-number">' + invoNumber + "</span>";
        html += '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGYAAABmCAYAAAA53+RiAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAAZdEVYdFNvZnR3YXJlAEFkb2JlIEltYWdlUmVhZHlxyWU8AAADImlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS4zLWMwMTEgNjYuMTQ1NjYxLCAyMDEyLzAyLzA2LTE0OjU2OjI3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDozNzlCRkFERkMyOUIxMUU2OTUwQUIxOTFBQjQzMzJDNiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDozNzlCRkFFMEMyOUIxMUU2OTUwQUIxOTFBQjQzMzJDNiI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjM3OUJGQUREQzI5QjExRTY5NTBBQjE5MUFCNDMzMkM2IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjM3OUJGQURFQzI5QjExRTY5NTBBQjE5MUFCNDMzMkM2Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+WcKmrwAAIUFJREFUeF7tXQd8VMXWP+lAQqghkoRAAgmhd6kiinTwgUh5SJEuSg3lIU1ApCMgKKGDICpFRaSIAioCYgN9KCAkFKVIIAUSSNu93/nP3sneTXazdzcb5P2+/HW5e+fe3DszZ06dM7NuCoMK8cjBXT0W4hFDIWEeURQS5iFiyqtTaOOGjepZ3igkzEPA+nXrqEp4Zdq8cROVDSirluaNQsIUIL755huqV6cuLVywkEqVKkW+fr7k6+urXs0bhYQpAFy9epU6tGtPA/r1Jw8PDypZsiS5u7sTDGC/QsI8fBiysuilYcOpeZOmdPPmTSpXrpwgjAQIU4KJpAc2CXPq1Ck6duwYxcbG0rlz5ygjI4P+85//ZF/77bffaMuWLRQXF0eHDx+mn376SVyLjo6mxMRE8T0/+OWXX2jIkCHUpk0b6tu3Lx05ckS9kn/Mnj2bunTpQm+//bZakn8smD+fKoZWpOPHj1P5oCDy9vZWr5gBwhQrWlQ9yxs2CfPHH3/QmTNn6K+//qJLly5RZmYmrV69Wlz773//K44vvPCCeNnTTz8tRgiAxqakpIjvzgIdB4KcOHGCbt26RadPnxbvGjx4sHqH8+jcuTMtW7aM+vTpQ3PnzqVJkyapV3IjNTWVwsPDhV6oUaOGWmqJnTt2UGSVCNq8aTMFMUGKcse7ubmpVy1hNBqpaLFi6lnesEkYT09P8vLyEkd88LJi6kMbNGhAe/fupREjRtCnn35KHTt2pFq1aolrqBjkqbPA81atWkWhoaHiWXfu3BGjD43+8ssvRac6Cwyyr7/+WjwDzy5fvjxt3GjbfB03bhy9+eabgkCQEFqAMx5v2IhenfwqlShRgooXL26TIBJZLOpgBOhBnj2ojdZoXwoOqlChguAgVH7fvn00dOhQ9Wr+MH36dHrsscfEu8GF6Ex0DEZbmTJlREc5i9u3b4uOAadUrFiR6tatK56L51vDoUOHqGvXruqZGXfv3qWhg4dQQkIClS5dWtdARHsw0LU6Jy/k+URJDC2BgF27dtG///1v9cyE1157jU6ePEl+fn657tcLiC10HhqalpaWLRJxfPDggagPruE9zgCESE5OFmKyevXqQlRXqVJFcCk6GNYTOBVHDA5cswZ/f3/67ezv1K9fX7p27Zogrj2gT3ys6B1b0CVzcrIoKJ8TGIkQO3rtdGsAd0BsJSUlCeLjCKDxP/zwgxihGHHoXGfx+eefC/EF0QuzFkYFBhkMDLzvX//6lzhCEkB35oXXZs2i3Xs+pcSERMpIT1dLrQOE0atfAN3KQMsFIMK9e/fUMxPef/99oWvQWHuy1hYgHmH9YcQ+99xzYmQC0C8NGzYUoxpw9vlAkyZNBAd+/PHHdP36derQoQPNmDGDfv/9d5rFHQ0umjNnDi1ZskQYCvYAfXvxUiyFVQ4XBpItoP+gi/TCLmGsiaXJkydTp06d6Pz58+IcumbdunXiOyynnETTi4CAAGH7GwwGoZxlQ6BYYXiAIPjkhyslpJUFhYwBAE7F+3AsW7as4Exblpg1xF64mKf+QD9K40kP7BJGjk7tKIVF9tVXXwnl+Morr1C9evUEp0A5QwRERUWpdzqON954Qyh9vA9ECgkJEYSQChY6bMqUKWJ0u8JfgrEB8x8jf+zYsVS7dm0KCwujpk2bqnfYx1vLl1MGc4vWCMipd1wuyiTHaDmnSJEi9NlnnwnLBkpfiq/mzZsLBfvnn3+qdzoOiMMxY8bQlStXhAEA8YVRLcUERiV0AERnREQE/f3336LcWbRv3174SXCWwbEQcS+++CI9//zz6h32sWjhIsHVEiAK+gM6URIIx1I6vX7AKY7Bd7AluAZRAShj2PWwburUqUP169fPl4J+9dVX6ejRo/Tkk08KvVOpUiUKDAwUhAKBwCmw0qDr8nIQ9QJRhsuXL1N8fDxdvHhRcCosNz2YzZwLUSj7BwMYHH/g4Oe0afMm8cx0aRiYu9Au7BLGGiT3wPGEPsARZi4q8O233woZ3apVK3GPs4A4fOedd4TYBMEPHjxIPj4+QmyCm/Bp165ddijIWcybN09wZXBwsOhgmMvjx48X3GMPaPvqVTEWOg998Mwzz4hnNm/Rgi5xPfEsWG4aoWMXeRJGK7603zE68AF7SoUG+YqOe+KJJ+js2bN5etTOAmISPgwsNHwQCcAxPwB3QpxNmDBBOI4YZCC+HkSPi6bSrFe13AKXYdmKt8Q5gEtfHPqSJkyaSPG39Itdm4SB2QrRgSM+IIJUthgV8gMLTN4HgGMQ+EQnuhrw+lEHiEl0Irh00aJF6lXnAfNc+mbgGj3eeQLXY8f27cJ6lIB47d27N5VQzXwtRo8ZTds++EA9sw+bWTKgPDobHAGioPLQI1DwkJtSCUNs3b9/XzQMVhkcNlg0MBAKAhgI8+fPF3WC2e6Ib+BK9O3zgvB5ICUAdCMMkctXr2RzUH5QmL7kBC5fvkJP8AANKl/eJKsYGDB9+/WlKVOnivP8opAwTqBTh44iaiDnXMC9t1mKXGJucRWcssr+P+PHH38UUwCSKEAKc8tEdRLRVSjkGAfRvGkzoeSlsQBuuZt8l85f/EOcuwqFHOMAvmBfCs6jNroOC3H2nNfVM9ehkGMcQJ1atZgo3tnmNBxMhItO//qLOHclCjlGJ7a9t41FWJqFj4NY2OIlS9Qz16KQY3SiakSkcD5lBBkxO0S6v/n2qDh3NQo5RgdWx8QIp1Eb1ocDvlwTenE1CjlGByqFVhSBSEkYRESCg4Los/37xHlBoJBj7GDuG3MtJuoAOJMr3nFdsqA1/M8TBokaSLAoCMDqilm1yiKsj4Btq6eeErOcBYn/KVGGoCkm0JChiSO8cIToL1y4IDJH9SbT6cXY0WPE9Lmc2kBXIZPn7PlzBR48feQ55r333hOJH7CIELXes2cPVatWjTZt2iQ8cES8kSfw1luuVcTJyUm0a+dOi7B+Gr+vR88eDyWibZNj0AGY7JJhbXuAo4XOQdqpK9GzZ08xIzhs2DC1xAR43Du542AdYXoZM4/IPXAVhg0ZSie/O0lFipqmL9BNEJvXrl/jXnMsrI9kD8wjafWUROXKla32mU3CIAEOoxIOFeSqhHauAaEJ2PMI6O3evVvIZEeSGPQAiX9YdYBJsg8//FAkgSAHDAl7yAnr1q2beD+46d133xUJGvkFMkLr160n8tlke5GL1rNXT3pt5kxx7ghatmwp0rq0/Yh+xeDCnNLPP/+cnfudDRDGGvr37y+O27ZtE0dr4A5TvykKK2Dlo48+Us9cCxZj4rhmzRqF9Yz4LsHetxIXF6cwAZXo6Gi1NH/o0f15pU6t2srjDRuJT6MGDZWQoGD1quMYOnSo+s0SqampSkhIiBIYGKicOXNGLTXBro6BiJDYvHmz+s0EJElIIMpaUGjcuLHgEiSuQ75jrn/kyJEiF+yll14SRgEyN8Hh+cUf58/Td999R94aEY5JsImTJqpnjgOSxBrAhXg2IghoIzJ1JGwSRrKwfOgnn3wi5vi/+OILcY7MS+SUPQwMHDhQDAqkFjVq1EhM6UIEIEMG4k0mT2Da+/vvvxffncXLI0aI6XIpsDHgslhcjx4zRi1xHfCexYsXi5RcJDEiX0LCLsdIHYOlCliSAPmLOX8s/NRaLAUJJH2vX79eZN8juRwZk8jQxPIPLEBC4gdGObJAkfLkLL468hXFxV6yCOvf41E9c3H+Ez6sAcYAVs0hgQMfGFASugiDxArkKYMYUFgYpUhRXbhwoUhVehiAcsS6HFg4SJF69tlnRfJDTEyMyKREsvhT7PjBWHAWE8ePp1Klzb6QkRRhWLT92jySXQ1IgR07dqhnZtglDOQecq6w/A4WFxsFQu/A84WZCp+CdZVVU9CVgC7BSjAQCM4llkhAhMG/wUBp1qyZ4OTu3bsTGyHqX+nHzh07KYkHHfLKJO6xvTrcpyhd3fY+pcffVksdR15ZM9CVNWvWzKWH7PYmliKA3TAqYdYhZwwiBd/xgZwH8ZC6ZA9IYHAWvXr1EvnKAPKLkTkpc9fAxXA0EWiEAYD0VpjX1laD2cJrM2ZYOI4GHmwl3d2og8FIxoBydHHUWPWK49DO4WgBKYQ0YAxumZcnYdOPGT16tJDbCEfYerAWcL7gYLZt21YtMWPr1q00bsxYsaKqJo945PU6AyScv/7668IaYzNeGCLajE8kAC5YsEBwEBw6iFqsE7WHdWvX0eKFi6hESTNhErlbpvO4rcuEyWBTIJ0HVd0TR6lYuOMxMkgXdD4cSfh96HIksQ8fPlyIYnAUEjygP5HQDtjkGIgJjCCICphzeX0Q5MNLrS2NS0lJpfHjokXlgllhYyVAl06d1KuOAems+ADIXZbiEzOJMJchEiCv0XiIXj1EAbAUvLi/OVs/i3VLKHdWCxAFYoj/9wooSxdGjFLvcAxwfsHFMGDgBIMoAAaPLTFX4EHM3iyCzp09ZxHaQXprY1bWyIZ3FJGRkcL7x1ECpibMd+iHQYMGCfNTLxbMX0CbWfxpl1Hc5i5ZRh5UkeV+pqbj0m/epJp7PiH/BvXVEn3A/ghoM1ZjS0DkYqk6ogKAbo7RAqEPiDREb7UfjFhrFoXE+XPn6Ni3x3LF28CFx9hmnzh+glqiH9BpWOaxfft22r9/v4ilYUXb1KlThQ5zhCgAwvrgeokM5paGbh5UI8uSKIA369ELo6PVM/2A/4fVD+AahGZgoCCVWBLFGnQRBh2A/GSwnvYD56tHjx7qXbkxbOgwm8sZsEwBQcg3lzi2PBwjG+IQ4XhwDqwaBDKx2MlRTGRrE2JYihOIjmT+Z4JRoWQrEsaN/ZuMq1co4cvDaok+4PktWrSgAQMGCDejdevWYgmJFmiXVngVmCg7wMR85eVXhHcL4CV4FcJ4Rm50ES7w5ApjlC9esph6sYP1MIFQSI2o6vRY+ceyCZPK9XvW3YMGZGZRipv1MavACeT7G/6if10OjBXoYDjqGAgwUtAXWOQFfQjjCsYTnGV8gAIjTM3qNYRjipfiBUZ+jYEb1I+/F1fcaRe3+7rRQEW57M+rV+mD7R9SSzYdHxYGDxwkJtrkqgQ4k2ms5T/KUugeHxUNxygsGdw0flrGnQQKX7KAAp/vrpbYB7oZA0AeAa2njzKt9atLlDmKNSzz8VLziyAa3Ggd+1AdueHNWKmuyTJSMI/ONK5oSIUK1LNHTxGofBjALOTBz00r1CTu8ugZzVySLohiGqtiQPEoN7J1BuJIeLFZfXmqY3FCSQx5BGCsyE9Ol6RACDPn9TlCwQNo3AP+pwc32I+JkMoVS+PPHf6+LNNAPvw9i+uKtZZtn2mT78WuejB+7DgqU9a8EiyT61KBidKW65MuiMLE4X+V9AzyqRpJNT7eTpksfiTc0ImZGXR9Q/6j2bbgcsJMZtMQRJGNVvg/I39/kUddKjdYAmXQNzEsMx6gnM+xTUizJk1zecGuxLmzZ+n4iRMWC46g6CczJUz7cJjqyDKeMm7HU9SaGPJl/6xI5cqksD6Q8OA2Xp05Wz1zPVxKGCjUre9uMScv8CeV/xnCo5ElmIXcBrKYGN5MsBUsJRJYhsP8hlOL7QoLCiNfGWlhKWI9cSuuXxjXA/WRMKSmUrn+/chb3cMyYuVyJpSGa7iubt7edHXxUrXEtXApYV5+aQSLiLLZ3AKF78uN7sYiQnCFFaTzvcFsns5i4qDZnmySIuzeuFEj0w0uBIKfcbGx2WF9rp54/0iDQndFiQnQJ4a0dIpYNF8tIfKrVZN8GzYgI4s3CQ+Y7oud3w0qL7iMMJj5w7p/7drLuyyvRzKbiA1MNHTRKlLgPndOYzYGhrMxgBgVxMz9+w+ofVtLWz+/mBCNsL5pPxoghW2xfvzuojwwIFolspKSqNLc3GKqaszblBkfb6Iow43/8yrhT7FTZ4hzV8JlhAG3aEUE4k0VyYOeZAsMQUAJhUWGMJ3ZYdXirrsb9cowUFvmsHt8HeIQWS+92LN3BXZ/spsS2BGVYX1Ej/14IPTKZINElJgAP8WjVGkq3/cFtcSMIsHBVKJ9W7bUzBsqeHA9b65dT0aN6esKuIQwMD3jLpln/jCekvifsfwR+2OodIGiTb9xnR5n58y/RXPKuqsVIER3+L6JrIyq8uh9wPfCGz7982kayY5qfjFtyhSLjUJRr7HMuA9QWw23ZNy6RVXXm7aYtIbIFaxrEu5kcw3+1rtMabqQj2kBa3AJYSaMH5+9ZRUA8xPxpmo5FKqRFWr5EcPF96h1q8knLIyMDx6IcwG+N4E7ahEPvhIebpTBzylZqiTt37ef3mAT3FmsX7debMIjfQU8tzor76ZcPy03w2fxf7Il+de3vQEDRFdA715k0NTbncV3/M6PKDPHQMsP8u35r12zlhYvWiT2AQDwsHh+5FYWY74sxuDti3LWK+ls1TT/y5wJAnxfvTa5c4chDiXhwX/PJdSXizxZ/iN0c+PGDZo5ayYNcmLD0qpVIsifrT1YfWjtbdZ97xrdyQ9KXg4cvvCAHc+mf14iD42etAY4nN+FVCRvNu+zDR2EW+rXp+pbXePb5JtjFsybl+1MAuncwHZc2XIaooBcBjalK02drJ6b0fDXU5TBsl9rEODv4P+s5M6DyAGxEWuaPnUa7du7V9yjF0uXvCkIL+du0pgoXbjZgVqiMLJSUih41Ci7RAHcPdyp/LChQgJIgGuSDh6ktKvO7zylRb44Zsb06bRr567ssDkelcBK/CMDd67G0lGYSGh4k1jTxnM5kRobR6cbN6ciFUKy5T0IU4xrdpY7dQIZKADl/HwE+/Z/fkDsK6YHlSqEUrnAQDGyQXpYiLvYPE5na1H6VRgUWYlJ1OTKRVOBTnxbvgIVZa4x1Znbm55JPuFhVHvPx6Yb8gGnOQYJ3RvWb7BYogA7q7cRTmNu8zN8ie0UIN/K4RS1bQulcadLpQpT9AE/oxYTdQxXM0Ex7QGGtFVsz64nf2Aac5gfGxBS3KTws4fhyfwKrbObmZBAlZc77o9UGD+OslgSmOBG7j7elPLDj3TvzBm1zHk4zTGDBg6kn378yRyd5cekMrfsZsUNc1dROwPmp8ImaqOf7Sfi/bVyFf05fwF5lyunlphQmp+3wsuD9hsN5M/PRUYJMmKwHEJGGXICYZ3wimEUFGzKP4Z57M3ibBv7S3dAFZUwCLO4MfEaHP/GVOAgToSGkxcbPjL6bOTnefJ5va8PiXNn4RTHXIqLoy8OfmERnU3hhg5jnQCLRxIFQBij6poY9SxvhIwcQaW6dGYOs9yELoF7cWymgepw4+/z82FdYZ4nr9DN2DFjqDSbsSAKRl4S/zuJZRmiyNncws9KvxVPUVuc38Kr4ozpFma/OxsxabGxlPh1/hbNOsUxbZ5uTXeY/aXfgtHoxo7hDvZBWI3zU00tN/Ko9QqtQHX37RHnenG6Q2fKiLtMHr4abuB3lOZ3DPZgPcbfEZUGV6Djfz59Sr3JBJGtz0QLYocQ12GQRDEx56Ub6A5ztaSL4f4D8m/elKLWr1FLnMPJyGrkUbSYKerMgJQwenjS46ecT9d1mGMOHzokcsu0ziSk7EhxNBMFHYnwRdRafdyiRd39n5G7n68pLiWHDT83ifXM22xYeLDHnsXPR5ZkFnfC062eUm8yYdQrI6lsQIAgCt/G3OxG0SzCkrhqZmbh+t1Npsh1+SMKUGneGxZc7sai25Bwm25/5vziWYcJI3e1kwC3hHBHtcpUKEO2mmFgu750ly4ijOEM6v90krLup7LFxJRQiQODAqJyBXdyCo986DXkT2MOp1vXbuIepJwi+Q9iFn92n//FXFBJthK15rEh+S6FTp5E/Jh8I7D7c+TBjqeYdlbhVbIUxU5wfuMfhwizaeNGYY1JDxoNxziJZocrSZ1gAsRovH2HIt5xfvkdKtbg+xOUdgPWl0oZBiIJ/vz8pazP4vl1eBfM9bO//y7mgmZMm27OM+Br7tzzL4KQXDdJA5jvbkV9qMJo8LlrELVpvWizhBBr6Wl0Y8t7aoljcEjHVAkLF9FZ6axh9Ebw9/mZRkpEs9WWG9hnKdO7J1We7fjqq5xI+u4k/dalKxUJMfs4AGZDj3l60Bz2ccpyCyC25KCBiBODhu+J5kq1YPMds6YSGX/foqqs8Es/bSkC84tTbTpQ1o0b5M7vB+AfZbKr0PSyY/4RoJtjZs+cRT5sGkuioOGwRRAIFDaJ2m7hrKWkuoQoQMkmjanSwvncmZZTztAbLTOzqD83ATOPqA/EGogCQMRW4Lq2E0QRRQIwSIrWrOFyogBVV79tmoJWxzpMaEQd/nxrpTh3BLoIg7SbtWvXWq5355e3Y90SwGLMoGm4gU3H0JnT1DPXIHjgACr34gDhCGqkGiVzwwcyt7bgxiP1SF7CEduqTuRBY1LJctSwHrz1N0VtNG1372oUCw8n/5YtLSfTMAU91zzhphe6CIOwOzIvIS4ASL8HLLtHZBlMk2BqwyG74UyGDHPNb8loUXnu6+TbqBEZUi1/zek212M6m8FhTCSYxQCOT7NpXYV1i8V08f37FNCnDxUJcu3Kai0iV60QuQLZXMPv92LiXJrp2J5mdgkD0/jzAweyPXy8DqGXXuylefGJ1pnMSkykiKWL1TPXo9aO98mDFTsiuVokchWWsA9VhAcI9B5mREdDxJqrporYFIpcVjDbWEkgjbbMc93YKtVMC7Ckub5qtZbZ7cIuYUwzk+UsuIUVDVs63AGixASF5b0nj8QynTqqJQUDhE6M4EyNaYrBgYm11TxYkrhu/ZlA3kwIbbzOkJxMlVyk9+whYsVSFrssTLVcU6okXYzWv919noQ5cviw2ArEy9s8VwJBMoRHYzrTP3foxZzNXpCo/8MJEUrJOVXgwefLecB0ZZqlarmFiejG4iRo8EC1pGDh4eVNgawTtdPnHmyY3HpvmzCM9CBPwoweNdpipRgsHX+W6V1Z4SOdVMKYnk5+DRtQcTuheFf9jhlkdt1vDlE6fnVDHZUA1rKE8nmGCPCr9ePLGYhAbFhrOn9IqLxgroiqZ3sjXDfv0qXowih9ye82CQNnErEorTMJs3gUO3YWWS/oCHDL6rxXC+N3J7FEz1XwjYykyM0bKe2aZfhfePcaTjayk+ffvLnDa1ryC9QgcNCLZNRwDSbTEvcdYKf5hlpiGzYdzPBKYYJbpN+CefwA/h6TkUUJbCZLYO7b/4kWFGVDjGEZOtaBYBkH/Azswgpiy/U2WOuC9SJYmuAMLs1fSDffXkXeVpZ7oGnpTLjGly+Qp43pgYLGscBg8tFsfQLp4hNZhWp/nPfqaquEeX3WbPrggw/MM5P8H0LvK4xuFATrBuOB/xcNZ+o3wTy5Zs5eC+zDjx9GwG/AANgNQlZSciOIhwxM7Ecj73MEZ4cOp7uHvyJPzeJWANPZAf37Udj0KWpJ3sBmCGgT6ifrCKAMHwwuRzeduLJgEd1ct4E8i5tXrKVhPeeRL8m3mu1fpspFGKzXqBQaSsHBIdmVg19Qjf2COezMJQkGMpWj4WX7vUDhM/J2KPEbMNjdAhyIHS2wPgQrjbESGksh4LiCmzAricVIWLPvKE49044y/7pO7sWKitoJ85id3SZx+jeqxm/WYDGWlBI5gXrj4yhOVAgjL267djLNq0xZqvuVaZcRa8hFmCGDh9D3J09m73qBq3fcFNrCuqUYV1pGaNHwjMQEanYlTpzbAzZ7g9hCfnNOYAUyFrOiQ8BRzm5vdbJGbXJjUevm4y04OYp1UNnO+s13LDACYSQnQ8diWkH2BTgGO29gqTrKsEMVNoKwh2sxa+mvRYstOBohpmo7PqSSzawPQouhcfnSJbESTFYESGMx1t5Nhl4keyuUlXyXKk3XH3rBdlXY2cIasIoKP6mFbH90jLNGwuO//UrFW7UkTx6dETHvOEQUCQRCsYwRk22oMzacQAIICISBg++oH9aAYuU0loPbQ/BLQ4WdiCxUCXDQxTG2kwQtCIM1k/h9LgkwUxqbxy+xb3BP0oSBFyDxIGjIILVEHxCOx05JK1euFA3PCfzKOebz8XvIzgBVrLY2Rsy3B/bQv9pLAhyBH9vGrlLY+gQ7B0L0QuQifUoSByuQgVGjRom5Hz0In8/mc7JpoQeAybTMv2/Rnf0H1BJLZBMGG9xA3MiZSeA+t7QPK3wvBQvhzJSBVxv2pv6Nb8AFWN2M1c/YiGD58uViVwus4sXWitBrEtgBA/rnnwB0KgK2eD8GkPwNZohX1FHqXG3WKTayA7fbAwYKApoWk2lslcZOzJ1rB2QTBjliMF8lMDvozhV5gTv1Poii0gVZJd4hwRTQsYOpQAfQKLnqWbu0DecoB+EksO0VtiP5JwARjn1oIL6wTQt+LBu/k4lNhbAyGnWGRMEvDGKNPrZNxJaQtjJ1ciJ80QLKTNRwDT/PmJJKN9/P/RNZ2YSB7JRKD0DoZShzSwYrf8XMLOrMpGPzC3IJONgeGw1gbT72oYFFhtEp02sB/DgcRuE/AYhuBGtRH6xcgAQBoTBQZN+Aa5B5ikGM+0AUrWmdF8q0a0NeQeUtuMazhD9dnjFLPTMjmzDYvQijF8jgPyyelUmdRejFDDhHxRo1IP96ddQSfYCZDMsL6yyxHwzWukNkocHYxiM775k75tSpU8I6+icA0QX9AU7GgMHGCdArsCTlbnwADASIOtyLOuslDBCxbAll3klQz0xc48b9jJw6LSzM5SeatxALkIIiI2lNw8fJ89BhMsrcMb4N4Y+Gv/5EPkgLdQDInsQHgOePHwRFiisUKoCEcXDstGnThAOn1XMPExs2bBCDCHXDjlJxcXEWFioIAOWP+mOfGrQFGymA+x1xjE89056y+G/lFLRI8+JBW3e/Oc3Lwio7euxbuvb3DTp1/BiV8y1GmWwhSSD0UqZ7N4eJAmhoLzodjdN2vryO7Ub+KaJgn02I3F9//VWYydgbDZvzQPzKLcCwrSMIhh/HxoZGsMqwS7pWBehB5Mq3KIt1lhYWhADAMdaQcOSIcrR0oPJDnQbKD7XqKUfLBCqGzEz1qmPw8/NTWFEqPBIVHlli59eKFSuKc26gwp6/euc/D+YKcWzcuHGunV0lvL29xZFNa2Xv3r3iu6M49VQb5buwCOX76rWVo6UClPg9ls+xSRjg6sp3lOOhlZWT/MeJx4+rpc6BzWWldevWolHx8fHi2LJlS2Xr1q3qHY8GMFBefvllhU1ihX0qtdQSrVq1UgYMGCDuYX9MLXUcf4yfpPzS4Vnl1qd71BIz8iRMQYAtHYWVq8LWmVryaCEjI0NZuHChwlakWmIdS5cuLdA25IqVFeLRQC6dU4hHA4WEeURRSJhHFIWEeURRSJhHEkT/B5N86Z8vayTbAAAAAElFTkSuQmCC" width="100" height="100"></img>';
        html += "</div>";
        html +=
          '<div class="Description"> <i>A product description is a form of marketing copy used to describe and explain the benefits of your product.</i></div>';
        html += "</div>";
        html += "</div>";
        html += "<br>";
        html += "</body>";
        html += "</html>";

        var dataFinal = encode.convert({
          string: html,
          inputEncoding: encode.Encoding.UTF_8,
          outputEncoding: encode.Encoding.BASE_64,
        });
        var jsonData = {
          base64: dataFinal,
          barcodeArray: [
            {
              id: "barcode1",
              name: invoNumber,
            },
          ],
        };
        MainJSONData.push(jsonData);
      }

      scriptContext.response.write(JSON.stringify(MainJSONData));
    } catch (e) {
      log.error("Catch Block Message In nst_wms_SL_ShipOrder_UI::", e);
    }
  };

  return { onRequest };
});

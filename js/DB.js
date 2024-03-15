
export default {

  data: {
    sheets: {},
    app: {},
  },

  async load(sheet) {
    this.data.sheets[sheet] = await getSheet(sheet);
  },

  async reload() {
    if (this.data.sheets == {}) {
      console.log('DB.reload() cancelled - no sheets loaded');
      return;
    }
    for (let sheet in this.data.sheets) {
      this.data.sheets[sheet] = await getSheet(sheet);
    }
  },

  get(sheet) {
    return this.data.sheets[sheet];
  },

  app: {
    get: function (key) {
      return this.data.app[key];
    },
    set: function (key, value) {
      this.data.app[key] = value;
    },
    reset: function () {
      this.data.app = {};
    }
  }
};

/* ------------------------------------------------ */

async function getSheet(sheet) {
  const shname = sheet.split(' ').join('+');
  const resp = await fetch('https://docs.google.com/spreadsheets/d/179MWre5cyz08-zz-lSPNi3sPeEoTKqWyzs659Z_BHyA/gviz/tq?tqx=out:json&tq&sheet=' + shname);
  const raw = await resp.text();


  const table = JSON.parse(raw.substring(47).slice(0, -2))['table'];
  let headers;
  let data;

  if (table.parsedNumHeaders == 1) {
    headers = table.cols.map((x) => {
      if (x) return x.label;
    }).filter(function (el) {
      return el != null;
    });
    data = table.rows.filter((x, index) => index >= 0);
  } else {
    headers = table.rows[0].c.map((x) => {
      if (x) return x.v;
    }).filter(function (el) {
      return el != null;
    });
    data = table.rows.filter((x, index) => index >= 1);
  }

  data = data.map((row) => {
    let d = {};
    let cols = headers;
    cols.forEach((c) => {
      let val = row.c[headers.indexOf(c)];
      if (val == null) {
        d[c] = '';
      } else {
        if (val.f) {
          d[c] = val.f;
        } else {
          d[c] = val.v;
        }
      }
    });
    return d;
  });

  console.log(sheet + ' loaded', data);

  return data;
}
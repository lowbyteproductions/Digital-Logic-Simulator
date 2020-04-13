const Trace = require('./trace');

const indexBy = (array, prop) => array.reduce((output, item) => {
  output[item[prop]] = item;
  return output;
}, {});

const not = a => ~a & 1;
const and = (a, b) => a && b;
const nand = (a, b) => not(a && b);
const or = (a, b) => a || b;
const nor = (a, b) => not(a || b);
const xor = (a, b) => a ^ b;
const xnor = (a, b) => not(a ^ b);

const createDFF = (name, clk, dIn) => {
  return [
    {
      id: `${name}.not_d_in`,
      type: 'not',
      inputs: [dIn],
      state: 0
    },
    {
      id: `${name}.d_nand_a`,
      type: 'nand',
      inputs: [dIn, clk],
      state: 0
    },
    {
      id: `${name}.q`,
      type: 'nand',
      inputs: [`${name}.d_nand_a`, `${name}.q_`],
      state: 0
    },
    {
      id: `${name}.d_nand_c`,
      type: 'nand',
      inputs: [`${name}.not_d_in`, clk],
      state: 0
    },
    {
      id: `${name}.q_`,
      type: 'nand',
      inputs: [`${name}.d_nand_c`, `${name}.q`],
      state: 0
    },
  ];
}

const createDFFE = (name, clk, dIn, dEnable) => {
  const gatedClock = {
    id: `${name}.clk`,
    type: 'and',
    inputs: [clk, dEnable],
    state: 0
  };

  return [
    gatedClock,
    ...createDFF(name, gatedClock.id, dIn)
  ];
}

const components = [
  {
    id: 'clock',
    type: 'controlled',
    inputs: [],
    state: 0,
  },
  {
    id: 'A',
    type: 'controlled',
    inputs: [],
    state: 0,
  },
  {
    id: 'E',
    type: 'controlled',
    inputs: [],
    state: 0,
  },
  ...createDFFE('DFF', 'clock', 'A', 'E')
];

const componentLookup = indexBy(components, 'id');

const evaluate = (components, componentLookup) => {
  const binaryOp = (logicFn, component) => {
    const aOut = componentLookup[component.inputs[0]];
    const bOut = componentLookup[component.inputs[1]];

    component.state = (aOut === 'x' || bOut === 'x')
      ? 'x'
      : logicFn(aOut.state, bOut.state);
    return;
  }

  components.forEach(component => {
    if (component.type === 'controlled') return;
    if (component.type === 'and') return binaryOp(and, component);
    if (component.type === 'nand') return binaryOp(nand, component);
    if (component.type === 'or') return binaryOp(or, component);
    if (component.type === 'nor') return binaryOp(nor, component);
    if (component.type === 'xor') return binaryOp(xor, component);
    if (component.type === 'xnor') return binaryOp(xnor, component);
    if (component.type === 'not') {
      const aOut = componentLookup[component.inputs[0]];
      component.state = (aOut === 'x') ? 'x' : not(aOut.state);
      return;
    }
  });
};

const EVALS_PER_STEP = 5;

const runFor = 25;
const trace = new Trace();

for (let iteration = 0; iteration < runFor; iteration++) {
  componentLookup.clock.state = not(componentLookup.clock.state);

  if (iteration === 0) {
    componentLookup.E.state = 1;
  }
  if (iteration === 1) {
    componentLookup.E.state = 0;
    componentLookup.A.state = 1;
  }
  if (iteration === 7) {
    componentLookup.E.state = 1;
  }
  if (iteration === 9) {
    componentLookup.E.state = 0;
    componentLookup.A.state = 0;
  }

  for (let i = 0; i < EVALS_PER_STEP; i++) {
    evaluate(components, componentLookup);
  }

  trace.sample(components);
}

trace.getTraces([
  'clock',
  'A',
  'E',
  'DFF.q'
]).forEach(trace => console.log(trace));

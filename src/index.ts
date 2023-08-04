import {YYParser} from './parser/parser';
import {Instruction} from './types/instruction';
import {Identifier, Expression} from './types/expression';
import {SymbolTable} from './types/symbolTable';

const parse = (source: string) => {
  const symTable = {};
  const parser = new YYParser(source, symTable);
  const success = parser.parse();

  return {success: success, instructions: parser.instructions, table: symTable};
};

const tryGetDOMElement = (id: string) => {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Element ${id} is null`);
  return element;
};

const inputArea = <HTMLInputElement>tryGetDOMElement('input');
const parseButton = tryGetDOMElement('parse-button');
const parseResultArea = tryGetDOMElement('parse-result');
const instructionsTable = tryGetDOMElement('instructions-table');
const symbolTable = tryGetDOMElement('symbol-table');

parseButton.onclick = (_: any) => parseDoc();

const parseDoc = () => {
  const source = inputArea.value;
  const {success, instructions, table} = parse(source);

  instructionsTable.innerHTML = '';
  symbolTable.innerHTML = '';

  parseResultArea.innerText = success ? 'success' : 'error detected';

  setInstructionRows(instructions);
  setSymbolRows(table);
};

const setInstructionRows = (instructions: Instruction[]) => {
  let rowCount = 0;
  instructions.forEach(i => {
    const row = document.createElement('tr');
    row.appendChild(createCell(rowCount));
    row.appendChild(createCell(i.op));
    row.appendChild(createCell(i.arg1.value));
    row.appendChild(createCell(i.arg2?.value ?? ""));
    instructionsTable.appendChild(row);
    rowCount += 1;
  });
};

const setSymbolRows = (symbols: SymbolTable) => {
  Object.entries(symbols).forEach(s => {
    const row = document.createElement('tr');
    row.appendChild(createCell(s[0]));
    row.appendChild(createCell(JSON.stringify(s[1])));
    symbolTable.appendChild(row);
  });
};

const createCell = (value: string | number) => {
  const cell = document.createElement('td');
  cell.setAttribute('style', 'text-align: center; border: 1px solid;');
  cell.innerHTML = <string>value;
  return cell;
};

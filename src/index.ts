import {YYParser} from './parser';

const parse = (source: string) => {
  const symTable = {};
  const parser = new YYParser(source, symTable);

  const success = parser.parse();
  console.log(success);
  console.log(parser.instructions);
  console.log(symTable);
};

parse('let N = eval (\\x.x) \n eval (\\y.y) N \n let F = N N');

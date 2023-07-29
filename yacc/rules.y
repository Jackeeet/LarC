%token NAME
%token IDENTIFIER
%token LAMBDA
%token DOT
%token EQUALS
%token LBRACKET
%token RBRACKET
%token LET 
%token EVAL
%token APPLY 

%left APPLY

%language "Java"

%%

program     : program declaration
            | program evaluation
            |
            ; 

declaration : LET IDENTIFIER EQUALS expression {declareVar($2, $4);}
            | LET IDENTIFIER EQUALS evaluation {declareVar($2, evaluate($4));}
            ;

evaluation  : EVAL expression {$$ = evaluate($2);}
            ;

expression  : IDENTIFIER  
            | NAME 
            | function 
            | application 
            | LBRACKET expression RBRACKET {$$ = $2;}
            ;

function    : LAMBDA NAME DOT expression {makeFunc($2, $4);}
            ;

application : expression APPLY expression {$$ = apply($1, $3);}
            ;
    
%%

evaluate(expr) {}

declareVar(id, expr) {}

makeFunc(bound, expr) {}

apply(left, right) {}


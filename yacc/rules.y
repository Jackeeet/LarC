%token NAME
%token IDENTIFIER
%token LAMBDA
%token DOT
%token EQUALS
%token LBRACKET
%token RBRACKET
%token LET 
%token EVAL

%language "Java"

%%

program     : program declaration {addDecl($2);}
            | program evaluation {addEval($2);}
            |
            ; 

declaration : LET IDENTIFIER EQUALS expression {declareVar($2, $4);}
            | LET IDENTIFIER EQUALS evaluation {declareVar($2, evaluate($4));}
            ;

evaluation  : EVAL expression {$$ = evaluate($2);}
            ;

expression  : IDENTIFIER {$$ = lookUp($1);}
            | NAME {$$ = handleLocal($1);}
            | function {handleFunc($1);}
            | application {handleApplication($1)}
            | LBRACKET expression RBRACKET {$$ = handleGrouping($2);}
            ;

function    : LAMBDA NAME DOT expression {makeFunc($2, $4);}
            ;

application : expression expression {$$ = apply($1, $2);}
            ;
    
%%

evaluate(expr) {
    
}

addDecl(decl) {
    
}

addEval(e) {
    
}

declareVar(id, expr) {
    
}

lookUp(name) {
    
}

handleLocal(local) {}

handleFunc(func) {}

handleApplication {}

handleGrouping {}

makeFunc(bound, expr) {
    
}

apply(left, right) {
    
}


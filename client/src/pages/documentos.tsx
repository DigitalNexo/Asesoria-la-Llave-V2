import { Route, Switch } from 'wouter';
import DocumentosIndex from '@/pages/documentacion/documentos/index';
import RecibosPage from '@/pages/documentacion/documentos/recibos';

export default function DocumentosPage() {
  return (
    <Switch>
      <Route path="/documentacion/documentos" component={DocumentosIndex} />
      <Route path="/documentacion/documentos/recibos" component={RecibosPage} />
      <Route path="/documentacion/documentos/proteccion-datos">
        {() => <div className="p-6"><h1 className="text-3xl font-bold">Protección de Datos</h1><p className="text-muted-foreground mt-2">En desarrollo...</p></div>}
      </Route>
      <Route path="/documentacion/documentos/domiciliacion">
        {() => <div className="p-6"><h1 className="text-3xl font-bold">Domiciliación Bancaria</h1><p className="text-muted-foreground mt-2">En desarrollo...</p></div>}
      </Route>
      <Route path="/documentacion/documentos/plantillas">
        {() => <div className="p-6"><h1 className="text-3xl font-bold">Plantillas</h1><p className="text-muted-foreground mt-2">En desarrollo...</p></div>}
      </Route>
      <Route>
        {() => <DocumentosIndex />}
      </Route>
    </Switch>
  );
}

import { Route, Switch } from "wouter";
import CombinedRoleAuth from "@/components/CombinedRoleAuth";
import RegistrationForm from "@/components/RegistrationForm";
import AddChildren from "@/components/AddChildren";

export default function Registration() {
  return (
    <Switch>
      <Route path="/register" component={CombinedRoleAuth} />
      <Route path="/register/form" component={RegistrationForm} />
      <Route path="/register/add-children" component={AddChildren} />
    </Switch>
  );
}

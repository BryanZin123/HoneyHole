import { AccountPanel } from "../../presentation/account-panel";
export default function Account() {
  return (
    <section className="page">
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h1>Your fishing, kept personal.</h1>
      <AccountPanel />
    </section>
  );
}

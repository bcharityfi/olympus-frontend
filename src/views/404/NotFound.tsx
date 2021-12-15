import OlygiveLogo from "../../assets/Olygive Logo.svg";
import "./notfound.scss";
import { Trans } from "@lingui/macro";

export default function NotFound() {
  return (
    <div id="not-found">
      <div className="not-found-header">
        <a href="https://olygivedao.finance" target="_blank">
          <img className="branding-header-icon" src={OlygiveLogo} alt="OlygiveDAO" />
        </a>

        <h4>
          <Trans>Page not found</Trans>
        </h4>
      </div>
    </div>
  );
}

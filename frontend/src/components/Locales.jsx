import PropTypes from 'prop-types';
import { IntlProvider } from 'react-intl';

// project imports
import useConfig from 'hooks/useConfig';
import messages, { flattenMessages } from 'i18n';

// ==============================|| LOCALIZATION ||============================== //

export default function Locales({ children }) {
  const { i18n } = useConfig();

  return (
    <IntlProvider
      locale={i18n}
      defaultLocale="ar"
      messages={flattenMessages(messages[i18n] || messages.ar)}
    >
      {children}
    </IntlProvider>
  );
}

Locales.propTypes = { children: PropTypes.node };

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';

const supportedLanguages = [
  { code: 'zh-CN', name: '中文' },
  { code: 'en', name: 'English' }
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common');

  const switchLanguage = (newLocale: string) => {
    i18n.changeLanguage(newLocale);
  };

  const getLanguageName = (lng: string) => {
    // 尝试获取翻译，如果失败则使用 fallback
    const translated = t(`languages.${lng}`, { defaultValue: '' });
    if (translated) {
      return translated;
    }

    // Fallback to hardcoded values
    return lng === 'zh-CN' ? '中文' : 'English';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost">
          <Languages size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className={i18n.language === lang.code ? 'bg-accent' : ''}
          >
            {getLanguageName(lang.code)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

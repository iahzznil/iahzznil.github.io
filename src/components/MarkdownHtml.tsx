import { SANDBOX_TEMPLATES } from '@codesandbox/sandpack-react';
import MarkdownIt from 'markdown-it';
import React, { memo, useContext, useEffect, useRef, useState } from 'react';
import { Root, createRoot } from 'react-dom/client';
import tw, { styled } from 'twin.macro';

import { DarkModeValueContext } from '../hooks/use-dark-mode';
import { highlight } from '../utils';
import Playground, { PlaygroundProps } from './Playground';

const Container = styled.div`
  ${tw`bg-transparent!`}

  > pre {
    ${tw`rounded shadow-md border border-gray-200 bg-white dark:bg-slate-800 dark:border-gray-800`}
  }
`;

const parseArgs = (raw: string): Record<string, string> => {
  const re = /(?<key>\w+)="(?<value>[^"]*)"/g;
  const args: Record<string, string> = {};

  for (const matched of raw.matchAll(re)) {
    const { key, value } = matched.groups!;
    args[key] = value;
  }

  const [lang] = raw.split(' ', 1);
  if (lang) args.lang = lang;

  return args;
};

const toHtml = (markdown: string, playground?: boolean) => {
  if (!markdown) return '';

  const md = new MarkdownIt({ highlight });
  const defaultFence = md.renderer.rules.fence;

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const { content, info } = tokens[idx];
    const args = parseArgs(info);

    if (playground && Object.keys(SANDBOX_TEMPLATES).includes(args.template)) {
      const el = document.createElement('div');

      Object.assign(el.dataset, {
        playground: true,
        code: content,
        template: args.template,
        autorun: args.autorun !== 'false',
      });
      return el.outerHTML;
    }

    if (info == "youtubem") {
      return '<div style="max-width:80%;"><div style="position:relative;padding-bottom:calc(56.25% + 52px);height: 0;"><iframe style="position:absolute;top:0;left:0;" width="100%" height="100%" src="https://odesli.co/embed/?url=https%3A%2F%2Fsong.link%2Fy%2F' + content + '&theme=light" frameborder="0" allowfullscreen sandbox="allow-same-origin allow-scripts allow-presentation allow-popups allow-popups-to-escape-sandbox" allow="clipboard-read; clipboard-write"></iframe></div></div>';
    }

    if (info == "wangyi") {
      return '<iframe frameborder="no" border="0" marginwidth="0" marginheight="0" width=330 height=86 src="//music.163.com/outchain/player?type=2&id=' + content + '&auto=1&height=66"></iframe>';
    }

    if (info == "iframe") {
      return content;
    }

    return defaultFence?.(tokens, idx, options, env, self) || '';
  };

  return md.render(markdown);
};

type ReactRootElement = HTMLDivElement & { reactRoot?: Root };

export type MarkdownHtmlProps = {
  markdown: string;
  playground?: boolean;
};

export default memo(function MarkdownHtml(props: MarkdownHtmlProps) {
  const { markdown, playground } = props;
  const darkMode = useContext(DarkModeValueContext);

  const container = useRef<HTMLDivElement>(null);
  const playgrounds = useRef<Root[]>([]);
  const [html, setHtml] = useState('');

  useEffect(() => {
    setHtml(toHtml(markdown, playground));
  }, []);

  useEffect(() => {
    if (!container.current) return;

    container.current
      .querySelectorAll<HTMLDivElement>('[data-playground]')
      .forEach((el: ReactRootElement) => {
        if (!el.reactRoot) {
          el.reactRoot = createRoot(el);
          playgrounds.current.push(el.reactRoot);
        }

        el.reactRoot.render(
          <Playground {...(el.dataset as PlaygroundProps)} theme={darkMode ? 'dark' : 'light'} />,
        );
      });
  }, [html, darkMode]);

  useEffect(() => {
    return () => {
      playgrounds.current.forEach((root) => {
        setTimeout(() => root.unmount(), 0);
      });
    };
  }, []);

  return (
    <Container
      ref={container}
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

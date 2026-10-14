import { CdnResource } from '../extra-models/cdnLibrary';
import { SnippetFile } from './snippet-file';

export interface CreateSnippetRequest {
  cdnResources?: Array<CdnResource>;
  description?: string;
  isPrivate?: boolean;
  name?: string;
  snippetFiles?: Array<SnippetFile>;
  tags?: Array<string>;
}

export interface GraphQLCommentNode {
  id: string;
  body: string;
  author: {
    login: string;
  } | null;
  url: string;
  createdAt: string;
  updatedAt: string;
}

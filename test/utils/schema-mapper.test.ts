import { expect } from 'chai';
import { mapFieldToSchema, getSchemaName, buildContentTypeSchemas } from '../../src/utils/schema-mapper';
import type { ContentType } from '@contentstack/management/types/stack/contentType';

describe('Schema Mapper', () => {
  describe('mapFieldToSchema', () => {
    it('should map text field to string schema', () => {
      const field = { data_type: 'text', uid: 'title' };
      const schema = mapFieldToSchema(field);
      expect(schema.type).to.equal('string');
    });

    it('should map number field to number schema', () => {
      const field = { data_type: 'number', uid: 'count' };
      const schema = mapFieldToSchema(field);
      expect(schema.type).to.equal('number');
    });

    it('should map boolean field to boolean schema', () => {
      const field = { data_type: 'boolean', uid: 'is_published' };
      const schema = mapFieldToSchema(field);
      expect(schema.type).to.equal('boolean');
    });

    it('should map date field to date-time string schema', () => {
      const field = { data_type: 'date', uid: 'published_date' };
      const schema = mapFieldToSchema(field);
      expect(schema.type).to.equal('string');
      expect(schema.format).to.equal('date-time');
    });

    it('should map link field to Asset reference', () => {
      const field = { data_type: 'link', uid: 'image' };
      const schema = mapFieldToSchema(field);
      expect(schema.$ref).to.equal('#/components/schemas/Asset');
    });

    it('should map reference field to content type reference', () => {
      const contentTypeMap = new Map([['author', 'Author']]);
      const field = { data_type: 'reference', uid: 'author_ref', reference_to: 'author' };
      const schema = mapFieldToSchema(field, contentTypeMap);
      expect(schema.$ref).to.equal('#/components/schemas/Author');
    });

    it('should map group field to object schema', () => {
      const field = {
        data_type: 'group',
        uid: 'address',
        schema: [
          { data_type: 'text', uid: 'street', mandatory: true },
          { data_type: 'text', uid: 'city', mandatory: false },
        ],
      };
      const schema = mapFieldToSchema(field);
      expect(schema.type).to.equal('object');
      expect(schema.properties).to.exist;
      expect(schema.properties?.street).to.exist;
      expect(schema.properties?.city).to.exist;
      if (schema.required && Array.isArray(schema.required)) {
        expect(schema.required).to.include('street');
      }
    });

    it('should map blocks field to array with oneOf items', () => {
      const field = {
        data_type: 'blocks',
        uid: 'content_blocks',
        blocks: [
          {
            uid: 'text_block',
            schema: [{ data_type: 'text', uid: 'text' }],
          },
          {
            uid: 'image_block',
            schema: [{ data_type: 'file', uid: 'image' }],
          },
        ],
      };
      const schema = mapFieldToSchema(field);
      expect(schema.type).to.equal('array');
      expect(schema.items?.oneOf).to.exist;
      expect(schema.items?.oneOf?.length).to.equal(2);
    });

    it('should handle multiple property for references', () => {
      const contentTypeMap = new Map([['tag', 'Tag']]);
      const field = {
        data_type: 'reference',
        uid: 'tags',
        reference_to: 'tag',
        field_metadata: { ref_multiple: true },
      };
      const schema = mapFieldToSchema(field, contentTypeMap);
      expect(schema.type).to.equal('array');
      expect(schema.items?.$ref).to.equal('#/components/schemas/Tag');
    });
  });

  describe('getSchemaName', () => {
    it('should convert snake_case to PascalCase', () => {
      expect(getSchemaName('blog_post')).to.equal('BlogPost');
      expect(getSchemaName('author')).to.equal('Author');
      expect(getSchemaName('content_type')).to.equal('ContentType');
    });

    it('should handle single word UIDs', () => {
      expect(getSchemaName('author')).to.equal('Author');
    });
  });

  describe('buildContentTypeSchemas', () => {
    it('should build schemas for content types', () => {
      const contentTypes = [
        {
          uid: 'blog_post',
          title: 'Blog Post',
          schema: [
            { data_type: 'text', uid: 'title', mandatory: true },
            { data_type: 'text', uid: 'body', mandatory: false },
          ],
        } as unknown as ContentType,
      ];

      const schemas = buildContentTypeSchemas(contentTypes);
      expect(schemas.BlogPost).to.exist;
      expect(schemas.BlogPost.properties?.title).to.exist;
      expect(schemas.BlogPost.properties?.body).to.exist;
      expect(schemas.BlogPost.required).to.include('title');
    });

    it('should include common schemas', () => {
      const schemas = buildContentTypeSchemas([]);
      expect(schemas.EntryMeta).to.exist;
      expect(schemas.Asset).to.exist;
      expect(schemas.Locale).to.exist;
    });
  });
});


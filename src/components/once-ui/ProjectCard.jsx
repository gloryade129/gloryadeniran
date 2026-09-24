'use client';

import {
  Column,
  Flex,
  Heading,
  SmartLink,
  Text,
  Badge,
} from "@once-ui-system/core";

export const ProjectCard = ({
  href,
  images = [],
  title,
  subcategory,
  description,
  link,
}) => {
  const mainImage = images[0] || '/images/banking_app.png';

  return (
    <Column
      fillWidth
      gap="m"
      border="neutral-alpha-weak"
      radius="l"
      padding="16"
      background="surface"
      className="once-glass hover:border-blue-500/40 transition-all duration-300"
    >
      {mainImage && (
        <div style={{ width: '100%', height: '280px', position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-m)' }}>
          <img
            src={mainImage}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
            className="hover:scale-105"
          />
        </div>
      )}
      <Flex
        s={{ direction: "column" }}
        fillWidth
        paddingX="s"
        paddingTop="12"
        paddingBottom="12"
        gap="m"
      >
        <Column flex={6} gap="8">
          {subcategory && (
            <Badge size="s" variant="neutral" style={{ width: 'fit-content' }}>
              {subcategory}
            </Badge>
          )}
          <Heading as="h2" wrap="balance" variant="heading-strong-l">
            {title}
          </Heading>
        </Column>
        <Column flex={6} gap="12">
          {description && (
            <Text wrap="balance" variant="body-default-s" onBackground="neutral-weak">
              {description}
            </Text>
          )}
          <Flex gap="16" wrap>
            {href && (
              <SmartLink
                suffixIcon="arrowRight"
                style={{ margin: "0", width: "fit-content" }}
                href={href}
              >
                <Text variant="body-default-s" weight="strong">Details</Text>
              </SmartLink>
            )}
            {link && (
              <SmartLink
                suffixIcon="arrowUpRightFromSquare"
                style={{ margin: "0", width: "fit-content" }}
                href={link}
              >
                <Text variant="body-default-s" weight="strong">Live Preview</Text>
              </SmartLink>
            )}
          </Flex>
        </Column>
      </Flex>
    </Column>
  );
};

export default ProjectCard;

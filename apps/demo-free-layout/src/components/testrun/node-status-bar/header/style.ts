import styled from 'styled-components';

export const NodeStatusHeaderStyle = styled.div`
  border: 1px solid rgba(68, 83, 130, 0.25);
  border-radius: 8px;
  background-color: #fff;

  position: absolute;
  top: calc(100% + 8px);
  left: 0;

  width: 100%;
`;

export const NodeStatusHeaderContentStyle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px;

  &-opened {
    padding-bottom: 0;
  }

  .status-title {
    height: 24px;
    display: flex;
    align-items: center;
    column-gap: 8px;
    min-width: 0;

    :global {
      .coz-tag {
        height: 20px;
      }
      .semi-tag-content {
        font-weight: 500;
        line-height: 16px;
        font-size: 12px;
      }
      .semi-tag-suffix-icon > div {
        font-size: 14px;
      }
    }
  }
  .status-btns {
    height: 24px;
    display: flex;
    align-items: center;
    column-gap: 4px;
  }

  .is-show-detail {
    transform: rotate(180deg);
  }
`;

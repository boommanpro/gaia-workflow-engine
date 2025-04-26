import styled from 'styled-components';

export const ConditionPort = styled.div`
  position: absolute;
  right: -12px;
  top: 50%;
`;

export const GroupContainer = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  position: relative;
  margin-bottom: 10px;
`;

export const GroupHeader = styled.div`
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const ConditionContainer = styled.div`
  padding: 10px;
  display: flex;
`;

export const ConditionItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

export const ExpressionContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

// ... 保留原有的 ConditionPort
